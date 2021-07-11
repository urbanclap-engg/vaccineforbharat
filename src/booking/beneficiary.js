import * as _ from 'lodash';
import moment from 'moment';
import { makeGetCall, makePostCall } from '../utils/network';
import { getEditDistance, getFirstName, getCurrentDateString,
  getStringSimilarityBasedBeneficiary } from '../utils/stringUtils';
import { PROCESS_STAGE, API_URLS, ALLOWED_NAME_EDITS, ERROR_CODE, ID_TYPE } from '../constants';

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
  if (!_.isEmpty(profileNameMatchedBeneficiary)) {
    return profileNameMatchedBeneficiary;
  }

  return getStringSimilarityBasedBeneficiary(beneficiaryList, state.name);
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
    // TODO: Need to be changed later for dose 2 
    if (!_.isEmpty(beneficiaryDetails.dose1_date) || !_.isEmpty(beneficiaryDetails.dose2_date)) {
      stateCallback({stage: PROCESS_STAGE.VACCINATED, beneficiaryDetails });
      return;
    }
    if (!_.isEmpty(beneficiaryDetails.appointments)) {
      // Check if a reschedule is needed - if appointment is more than a day old.
      const appointmentId = _.get(beneficiaryDetails.appointments, 'appointment_id', '');
      const slotDate = _.get(beneficiaryDetails.appointments, 'date', '');
      if(!_.isEmpty(appointmentId)
        && !_.isEmpty(slotDate)
        && moment.utc().diff(moment.utc(slotDate, 'DD-MM-YYYY'), 'days') >= 2) {
        stateCallback({stage: PROCESS_STAGE.FETCH_SLOTS, beneficiaryDetails, appointmentId});
      }
      stateCallback({stage: PROCESS_STAGE.EXISTING_BOOKING, beneficiaryDetails });
      return;
    }
    stateCallback({stage: PROCESS_STAGE.FETCH_SLOTS, beneficiaryDetails });
  } catch(err) {

  }
};