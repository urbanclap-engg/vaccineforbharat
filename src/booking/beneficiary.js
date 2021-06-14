import * as _ from 'lodash';
import { makeGetCall, makePostCall } from '../utils/network';
import { getEditDistance, getFirstName, getCurrentDateString } from '../utils/stringUtils';
import { PROCESS_STAGE, API_URLS, ALLOWED_NAME_EDITS, ERROR_CODE, ID_TYPE } from '../constants';

const filterBeneficiary = (state, beneficiaryList) => {
  const paramsName = getFirstName(state.name);
  const paramsDisplayName = getFirstName(state.displayName);
  const { id_type: idType, id_number: idNumber='' } = state;
  const maskedIdNumber = idNumber.slice(-4);

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

  return _.find(beneficiaryList, ({ name }) => {
    const firstName = getFirstName(name);
    const editDistanceScore = getEditDistance(paramsDisplayName, firstName);
    return editDistanceScore < ALLOWED_NAME_EDITS;
  });
};

const getBeneficiaryDetailsEntity = (beneficiaryList) => {
  // Comment: Keys in buildForBharat payload are all snake_case. Transformation needs to be done at BE service level.
  return _.map(beneficiaryList, (beneficiary) => {
    // Comment: Send it raw, omitting not required
    return _.omitBy({
      beneficiaryId: beneficiary.beneficiary_reference_id,
      name: beneficiary.name,
      vaccine: beneficiary.vaccine,
      vaccinationStatus: beneficiary.vaccination_status,
      dose1Date: beneficiary.dose1_date,
      dose2Date: beneficiary.dose2_date,
      }, _.isEmpty);
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
      stateCallback({stage: PROCESS_STAGE.EXISTING_BOOKING, beneficiaryDetails });
      return;
    }
    stateCallback({stage: PROCESS_STAGE.FETCH_SLOTS, beneficiaryDetails });
  } catch(err) {

  }
};