import * as _ from 'lodash';
import { makeGetCall, makePostCall } from '../utils/network';
import { getCurrentDateString, getSlotDateString } from '../utils/stringUtils';
import { PROCESS_STAGE, API_URLS, SLOT_FILTER, ERROR_CODE, FREE_SLOT_THRESHOLD, VACCINE_TYPE } from '../constants';

const getTargetSlotTime = (availableSession) => {
  const slotDate = availableSession.date;
  const currentDateString = getCurrentDateString();

  if (currentDateString !== slotDate) {
    return availableSession.slots[0];
  }
  return _.last(availableSession.slots);
};

const getPrioritisedSlot = (availableSlots) => {
  const freeSlotsAboveThreshold = _.filter(availableSlots, (slots) => {
    return _.get(slots, 'fee_type') == VACCINE_TYPE.FREE
      && _.get(slots, 'available_capacity_dose1') >= FREE_SLOT_THRESHOLD;
  });
  if(!_.isEmpty(freeSlotsAboveThreshold)) {
    return _.maxBy(freeSlotsAboveThreshold, 'available_capacity_dose1');
  }
  return _.maxBy(availableSlots, 'available_capacity_dose1');
};

const getAvailableVaccineSlot = (state, centerList) => {
  const lastAttemptedSession = _.get(state, 'vaccineSlot.session_id');
  const availableSlots = [];
  _.forEach(centerList, (center) => {
    const { sessions } = center;
    const availableSessions = _.filter(sessions, (session) => {
      // TODO: Update to param based dose check later
      const centerAvailability = _.get(session, 'available_capacity', 0);
      const dose1Availability = _.get(session, 'available_capacity_dose1', 0);
      return centerAvailability > 0 && dose1Availability >= SLOT_FILTER.MIN_CAPACITY &&
        session.min_age_limit === SLOT_FILTER.MIN_AGE && session.session_id !== lastAttemptedSession;
    });

    const maxAvailabilitySession = _.maxBy(availableSessions, 'available_capacity_dose1');

    if (maxAvailabilitySession) {
      const targetSlot = getTargetSlotTime(maxAvailabilitySession);
      availableSlots.push({
        ...center,
        ...maxAvailabilitySession,
        slot_time: targetSlot
      });
    }
  });

  return getPrioritisedSlot(availableSlots);
};

export const fetchSlots = async(state, stateCallback) => {
  const { district } = state;
  if (!district) {
    stateCallback({ stage: PROCESS_STAGE.REGISTERED });
    return;
  }
  const dateString = getSlotDateString();
  try {
    const data = await makeGetCall(`${API_URLS.FETCH_SLOTS}?district_id=${district}&date=${dateString}`,
     stateCallback, state.token);
    const centerList = _.get(data, 'centers', []);
    const vaccineSlot = getAvailableVaccineSlot(state, centerList);
    if (_.isEmpty(vaccineSlot)) {
      stateCallback({errorObj: { code: ERROR_CODE.NO_SLOT, message: `No available slot found for district ${district}`} })
      return;
    }
    stateCallback({ stage: PROCESS_STAGE.SCHEDULE, vaccineSlot })
  } catch(err) {

  }
};
