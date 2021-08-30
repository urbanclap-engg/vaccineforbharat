import * as _ from 'lodash';
import { makeGetCall } from '../utils/network';
import { getCurrentDateString, getSlotDateString } from '../utils/stringUtils';
import {
  PROCESS_STAGE,
  API_URLS,
  SLOT_FILTER,
  ERROR_CODE,
  FREE_SLOT_THRESHOLD,
  VACCINE_FEE_THRESHOLD,
  DEFAULT_VACCINE_FOR_FIRST_DOSE,
  VACCINE_TYPE,
  DOSE_TYPE,
} from "../constants";

const getTargetSlotTime = (availableSession) => {
  const slotDate = availableSession.date;
  const currentDateString = getCurrentDateString();

  if (currentDateString !== slotDate) {
    return availableSession.slots[0];
  }
  return _.last(availableSession.slots);
};

const getPrioritisedSlot = (availableSlots, capacityForDose, doseToBook) => {
  const freeSlotsAboveThreshold = _.filter(availableSlots, (slots) => {
    return _.get(slots, 'fee_type') == VACCINE_TYPE.FREE
      && _.get(slots, [capacityForDose]) >= FREE_SLOT_THRESHOLD;
  });
  if(!_.isEmpty(freeSlotsAboveThreshold)) {
    return _.maxBy(freeSlotsAboveThreshold, slot => slot[capacityForDose]);
  }
  if(doseToBook === DOSE_TYPE.SECOND) {
    return _.maxBy(availableSlots, slot => slot[capacityForDose]);
  }
  const paidSlotsBelowThresholdPrice = _.filter(availableSlots, (slot) => {
    const vaccineFeeList = _.get(slot, 'vaccine_fees', []);
    const vaccineName = _.get(slot, 'vaccine');
    const vaccineFee = _.filter(vaccineFeeList, (vaccine) => {
      return _.get(vaccine, 'vaccine') === vaccineName
    });

    if(_.isEmpty(vaccineFee)) {
      return false;
    }
    return _.get(slot, 'fee_type') === VACCINE_TYPE.PAID
      && _.toNumber(vaccineFee[0].fee) <= VACCINE_FEE_THRESHOLD;
  });
  
  return _.maxBy(paidSlotsBelowThresholdPrice, slot => slot[capacityForDose]);
};

const getAvailableVaccineSlot = (state, centerList, doseToBook, firstDoseVaccine) => {
  const lastAttemptedSession = _.get(state, 'vaccineSlot.session_id');
  const capacityForDose = doseToBook === DOSE_TYPE.SECOND ? 'available_capacity_dose2': 'available_capacity_dose1';
  const availableSlots = [];
  _.forEach(centerList, (center) => {
    const { sessions } = center;
    const availableSessions = _.filter(sessions, (session) => {
      const centerAvailability = _.get(session, 'available_capacity', 0);
      const doseAvailability = _.get(session, [capacityForDose], 0);
      const vaccineName = _.get(session, 'vaccine', '');

      const filterCriteria = centerAvailability > 0 && doseAvailability >= SLOT_FILTER.MIN_CAPACITY &&
        session.min_age_limit === SLOT_FILTER.MIN_AGE && session.session_id !== lastAttemptedSession;
      
      if(doseToBook === DOSE_TYPE.SECOND && !_.isEmpty(vaccineName) && !_.isEmpty(firstDoseVaccine)) {
        return filterCriteria && vaccineName === firstDoseVaccine;
      }
      else if(doseToBook === DOSE_TYPE.FIRST) {
        return filterCriteria && vaccineName === DEFAULT_VACCINE_FOR_FIRST_DOSE;
      }
      return filterCriteria;
    });

    const maxAvailabilitySession = _.maxBy(availableSessions, session => session[capacityForDose]);

    if (maxAvailabilitySession) {
      const targetSlot = getTargetSlotTime(maxAvailabilitySession);
      availableSlots.push({
        ...center,
        ...maxAvailabilitySession,
        slot_time: targetSlot
      });
    }
  });

  return getPrioritisedSlot(availableSlots, capacityForDose, doseToBook);
};

export const fetchSlots = async(state, stateCallback) => {
  const { district, doseToBook, firstDoseVaccine } = state;
  if (!district) {
    stateCallback({ stage: PROCESS_STAGE.REGISTERED });
    return;
  }
  const dateString = getSlotDateString();
  try {
    const data = await makeGetCall(`${API_URLS.FETCH_SLOTS}?district_id=${district}&date=${dateString}`,
     stateCallback, state.token);
    const centerList = _.get(data, 'centers', []);
    const vaccineSlot = getAvailableVaccineSlot(state, centerList, doseToBook, firstDoseVaccine);
    if (_.isEmpty(vaccineSlot)) {
      stateCallback({errorObj: { code: ERROR_CODE.NO_SLOT, message: `No available slot found for district ${district}`} })
      return;
    }
    stateCallback({ stage: PROCESS_STAGE.SCHEDULE, vaccineSlot })
  } catch(err) {

  }
};
