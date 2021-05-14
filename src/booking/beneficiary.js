import * as _ from 'lodash';
import { makeGetCall, makePostCall } from '../utils/network';
import { getEditDistance, getFirstName, getCurrentDateString } from '../utils/stringUtils';
import { PROCESS_STAGE, API_URLS, ALLOWED_NAME_EDITS, ERROR_CODE } from '../constants';

const filterBeneficiary = (state, beneficiaryList) => {
  const paramsName = getFirstName(state.name);
  return _.find(beneficiaryList, (entry) => {
    const { name } = entry;
    const firstName = getFirstName(name);
    const editDistance = getEditDistance(paramsName, firstName);
    return editDistance < ALLOWED_NAME_EDITS;
  })
};

export const fetchBenficiaries = async (state, stateCallback) => {
  try {
    const data = await makeGetCall(API_URLS.FETCH_BENEFICIARY, stateCallback, state.token);
    const beneficiaryList = _.get(data, 'beneficiaries', []);
    const beneficiaryDetails = filterBeneficiary(state, beneficiaryList);
    if (_.isEmpty(beneficiaryDetails)) {
      stateCallback({errorObj: { code: ERROR_CODE.NO_BENEFICIARY, message: 'No beneficiary with name match' } });
      return;
    }
    if (!_.isEmpty(beneficiaryDetails.appointments)) {
      stateCallback({stage: PROCESS_STAGE.EXISTING_BOOKING, beneficiaryDetails });
    }
    // TODO: Need to be changed later for dose 2 
    if (!_.isEmpty(beneficiaryDetails.dose_1_date)) {
      stateCallback({stage: PROCESS_STAGE.VACCINATED, beneficiaryDetails });
    }
    stateCallback({stage: PROCESS_STAGE.FETCH_SLOTS, beneficiaryDetails });
  } catch(err) {

  }
};