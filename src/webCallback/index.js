import { getUrlParamsFromObj } from '../utils/queryParams';
import { PROCESS_STAGE } from '../constants';
import * as _ from 'lodash';

export const triggerCallback = (state) => {
  const callbackParams = getCallbackParams(state);
  const requestBody = {
    ...callbackParams,
    auth_key: state.auth_key,
    phone: state.phone,
    app_state: state.stage
  }
  const queryString = getUrlParamsFromObj(requestBody);
  window.setTimeout(function() {
    window.location.href = `${state.callback}?${queryString}`;
  }, 3000);
};

const getCallbackParams = (state) => {
  const { beneficiaryDetails={} } = state;
  const errorObj = getErrorParams(state);
  const baseState = {
    beneficiary_id: beneficiaryDetails.beneficiary_reference_id,
    name: beneficiaryDetails.name,
    vaccine: beneficiaryDetails.vaccine,
    vaccination_status: beneficiaryDetails.vaccination_status,
    dose_1_date: beneficiaryDetails.dose1_date,
    dose_2_date: beneficiaryDetails.dose2_date,
    err_code: errorObj.code,
    err_message: errorObj.message
  };

  switch(state.stage) {
    case PROCESS_STAGE.EXISTING_BOOKING:
      const { appointments=[] } = beneficiaryDetails;
      const lastAppointment = _.last(appointments) || {};
      return {
        ...baseState,
        center_id: lastAppointment.center_id,
        center_name: lastAppointment.name,
        slot: lastAppointment.slot,
        session_id: lastAppointment.session_id,
        date: lastAppointment.date,
        dose: lastAppointment.dose,
        appointment_id: lastAppointment.appointment_id
      };
    case PROCESS_STAGE.SLOT_BOOKED:
      const { vaccineSlot={}, appointmentId } = state;
      return {
        ...baseState,
        appointment_id: appointmentId,
        center_id: vaccineSlot.center_id,
        center_name: vaccineSlot.name,
        center_address: vaccineSlot.address,
        center_district_name: vaccineSlot.district_name,
        center_pincode: vaccineSlot.pincode,
        slot: vaccineSlot.slots[0],
        session_id: vaccineSlot.session_id,
        date: vaccineSlot.date
      };
    default:
      return baseState;
  }
};

const getErrorParams = (state) => {
  if (state.stage === PROCESS_STAGE.SLOT_BOOKED) {
    return {};
  }
  return state.errorObj || {};
};