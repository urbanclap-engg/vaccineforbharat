import * as _ from 'lodash';
import { makeGetCall, makePostCall } from '../utils/network';
import { getEditDistance, getFirstName, getCurrentDateString } from '../utils/stringUtils';
import { PROCESS_STAGE, API_URLS, ALLOWED_NAME_EDITS, ERROR_CODE, ID_TYPE } from '../constants';

const filterBeneficiary = (state, beneficiaryList, updateRegisteredBeneficiaryList) => {
  const paramsName = getFirstName(state.name);
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
  const registeredBeneficiaryList = _.map(beneficiaryList, 'name');
  updateRegisteredBeneficiaryList(registeredBeneficiaryList);
  return _.find(beneficiaryList, (entry) => {
    const { name } = entry;
    const firstName = getFirstName(name);
    const editDistance = getEditDistance(paramsName, firstName);
    return editDistance < ALLOWED_NAME_EDITS;
  });
};

export const fetchBenficiaries = async (state, stateCallback, updateRegisteredBeneficiaryList) => {
  try {
    const data = await makeGetCall(API_URLS.FETCH_BENEFICIARY, stateCallback, state.token);
    const beneficiaryList = _.get(data, 'beneficiaries', []);
    const beneficiaryDetails = filterBeneficiary(state, beneficiaryList, updateRegisteredBeneficiaryList);
    if (_.isEmpty(beneficiaryDetails)) {
      stateCallback({ stage: PROCESS_STAGE.NOT_REGISTERED });
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