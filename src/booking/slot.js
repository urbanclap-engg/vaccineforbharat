import * as _ from 'lodash';
import { makeGetCall } from '../utils/network';
import { getCurrentDateString, getSlotDateString } from '../utils/stringUtils';
import {
  PROCESS_STAGE,
  API_URLS,
  SLOT_FILTER,
  ERROR_CODE,
  FREE_SLOT_THRESHOLD,
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

const getPrioritisedSlot = (availableSlots, capacityForDose) => {
  const freeSlotsAboveThreshold = _.filter(availableSlots, (slots) => {
    return _.get(slots, 'fee_type') == VACCINE_TYPE.FREE
      && _.get(slots, [capacityForDose]) >= FREE_SLOT_THRESHOLD;
  });
  if(!_.isEmpty(freeSlotsAboveThreshold)) {
    return _.maxBy(freeSlotsAboveThreshold, slot => slot[capacityForDose]);
  }
  return _.maxBy(availableSlots, slot => slot[capacityForDose]);
};

const getAvailableVaccineSlot = (state, centerList, doseToBook) => {
  const lastAttemptedSession = _.get(state, 'vaccineSlot.session_id');
  const capacityForDose = doseToBook === DOSE_TYPE.SECOND ? 'available_capacity_dose2': 'available_capacity_dose1';
  const availableSlots = [];
  _.forEach(centerList, (center) => {
    const { sessions } = center;
    const availableSessions = _.filter(sessions, (session) => {
      const centerAvailability = _.get(session, 'available_capacity', 0);
      const doseAvailability = _.get(session, [capacityForDose], 0);
      return centerAvailability > 0 && doseAvailability >= SLOT_FILTER.MIN_CAPACITY &&
        session.min_age_limit === SLOT_FILTER.MIN_AGE && session.session_id !== lastAttemptedSession;
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

  return getPrioritisedSlot(availableSlots, capacityForDose);
};

export const fetchSlots = async(state, stateCallback) => {
  const { district, doseToBook } = state;
  if (!district) {
    stateCallback({ stage: PROCESS_STAGE.REGISTERED });
    return;
  }
  const dateString = getSlotDateString();
  try {
    const data = await makeGetCall(`${API_URLS.FETCH_SLOTS}?district_id=${district}&date=${dateString}`,
     stateCallback, state.token);
    const centerList = _.get(data, 'centers', []);
    const vaccineSlot = getAvailableVaccineSlot(state, centerList, doseToBook);
    if (_.isEmpty(vaccineSlot)) {
      stateCallback({errorObj: { code: ERROR_CODE.NO_SLOT, message: `No available slot found for district ${district}`} })
      return;
    }
    stateCallback({ stage: PROCESS_STAGE.SCHEDULE, vaccineSlot })
  } catch(err) {

  }
};
