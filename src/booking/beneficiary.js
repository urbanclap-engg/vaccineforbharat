import * as _ from 'lodash';
import moment from 'moment';
import { makeGetCall, makePostCall } from '../utils/network';
import { getEditDistance, getFirstName, getCurrentDateString,
  getStringSimilarityBasedBeneficiary } from '../utils/stringUtils';
import {
  PROCESS_STAGE,
  API_URLS,
  ALLOWED_NAME_EDITS,
  ID_TYPE,
  VACCINE_SECOND_DOSE_BUFFER_DAYS,
  DOSE_TYPE,
} from '../constants';

const filterBeneficiary = (state, beneficiaryList) => {
  const paramsName = getFirstName(state.name);
  const paramsDisplayName = getFirstName(state.displayName);
  const { id_type: idType, id_number: idNumber='' } = state;
  const maskedIdNumber = idNumber.slice(-4);

  const matchedBeneficiaryRecord = _.find(beneficiaryList, { beneficiary_reference_id: state.beneficiaryId });
  if (!_.isEmpty(matchedBeneficiaryRecord)) {
    return matchedBeneficiaryRecord;
  }

  const idMatchRecord = _.find(beneficiaryList, (entry) => {
    const entryIdType = ID_TYPE[entry.photo_id_type];
    const entryIdNumber = _.get(entry, 'photo_id_number', '').slice(-4);

    return idType === entryIdType && maskedIdNumber === entryIdNumber;
  });
  if (!_.isEmpty(idMatchRecord)) {
    return idMatchRecord;
  }

  const similarBeneficiaries = getStringSimilarityBasedBeneficiary(beneficiaryList, state.name);
  if(!_.isEmpty(similarBeneficiaries)) {
    return similarBeneficiaries;
  }

  const verifiedNameMatchedBeneficiary = _.find(beneficiaryList, (entry) => {
    const { name } = entry;
    const firstName = getFirstName(name);
    const editDistance = getEditDistance(paramsName, firstName);
    return editDistance < ALLOWED_NAME_EDITS;
  });
  if (!_.isEmpty(verifiedNameMatchedBeneficiary)) {
    return verifiedNameMatchedBeneficiary;
  }

  const profileNameMatchedBeneficiary = _.find(beneficiaryList, ({ name }) => {
    const firstName = getFirstName(name);
    const editDistanceScore = getEditDistance(paramsDisplayName, firstName);
    return editDistanceScore < ALLOWED_NAME_EDITS;
  });

  return profileNameMatchedBeneficiary;
};

const getBeneficiaryDetailsEntity = (beneficiaryList) => {
  return _.map(beneficiaryList, (beneficiary) => {
    return {
      beneficiary_id: beneficiary.beneficiary_reference_id,
      name: beneficiary.name,
      vaccine: beneficiary.vaccine,
      vaccination_status: beneficiary.vaccination_status,
      dose1_date: beneficiary.dose1_date,
      dose2_date: beneficiary.dose2_date,
      };
  });
};

const checkIfAppointmentExpired = (appointmentId, slotDate) => {
  return !_.isEmpty(appointmentId)
  && !_.isEmpty(slotDate)
  && moment.utc().diff(moment.utc(slotDate, 'DD-MM-YYYY'), 'days') >= 2;
};

const checkIfEligibleForDose2 = beneficiaryDetails => {
  const dose1Date = _.get(beneficiaryDetails, "dose1_date", "");
  const vaccine = _.get(beneficiaryDetails, "vaccine", "");
  return (
    !_.isEmpty(dose1Date) &&
    moment.utc().diff(moment.utc(dose1Date, "DD-MM-YYYY"), "days") >=
      VACCINE_SECOND_DOSE_BUFFER_DAYS[vaccine]
  );
};

export const fetchBenficiaries = async (state, stateCallback) => {
  try {
    const data = await makeGetCall(API_URLS.FETCH_BENEFICIARY, stateCallback, state.token);
    const beneficiaryList = _.get(data, 'beneficiaries', []);
    const beneficiaryDetails = filterBeneficiary(state, beneficiaryList);
    if (_.isEmpty(beneficiaryDetails)) {
      stateCallback({
        stage: PROCESS_STAGE.NOT_REGISTERED,
        registeredBeneficiaryList: getBeneficiaryDetailsEntity(beneficiaryList)
      });
      return;
    }
    // Go to vaccinated stage -
    // 1. If Dose 2 date is present.
    // 2. If Dose 2 date is not present, but beneficiary is still not eligible for dose 2.
    if(!_.isEmpty(beneficiaryDetails.dose2_date)) {
      stateCallback({ stage: PROCESS_STAGE.VACCINATED, beneficiaryDetails });
      return;
    }
    const isUserEligibleForDose2 = checkIfEligibleForDose2(beneficiaryDetails);
    const doseToBook = isUserEligibleForDose2 ? DOSE_TYPE.SECOND: DOSE_TYPE.FIRST;
    if (!isUserEligibleForDose2 && !_.isEmpty(beneficiaryDetails.dose1_date)) {
      stateCallback({ stage: PROCESS_STAGE.VACCINATED, beneficiaryDetails });
      return;
    }

    const firstDoseVaccine = _.get(beneficiaryDetails, 'vaccine', '');
    if (!_.isEmpty(beneficiaryDetails.appointments)) {
      // Check if a reschedule is needed - if appointment is more than a day old.
      const latestAppointment = _.maxBy(beneficiaryDetails.appointments, 'date');
      const appointmentId = _.get(latestAppointment, 'appointment_id', '');
      const slotDate = _.get(latestAppointment, 'date', '');

      if(checkIfAppointmentExpired(appointmentId, slotDate)) {
        stateCallback({stage: PROCESS_STAGE.FETCH_SLOTS, beneficiaryDetails, appointmentId, doseToBook, firstDoseVaccine });
        return;
      }
      stateCallback({stage: PROCESS_STAGE.EXISTING_BOOKING, beneficiaryDetails });
      return;
    }
    stateCallback({stage: PROCESS_STAGE.FETCH_SLOTS, beneficiaryDetails, doseToBook, firstDoseVaccine });
  } catch(err) {

  }
};
