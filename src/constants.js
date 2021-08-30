
export const SECRET_KEYS = [
  'U2FsdGVkX1/fkazU2I2Rdz3hI7iWT6HRzThZj16rpyn4xYM6wcbd84k4CpJimxC0YpG3kFn9qog6LhmaRoS14g==',
  'U2FsdGVkX19I0TpTI50qTW+0o+LEWSBPYIcivZR4gvANVyLhRhP+rwapNMmyE3tE7e2EeEIV8X6YVfOODlCUbg==',
  'U2FsdGVkX181DnPRmCbp6NePNHeHRfh3dAO9dMMSApKdvNpIEcK11CYuqjyI04DU4TRuktcSduxWej8OGCz9ZA==',
  'U2FsdGVkX19NYwIf1jzNr2ghhC7bH1/H36TLGsiUKSopzfhdHB4aSa2RczWmSdN35ZwZXJ18cha9qX1vLO1BpQ==',
  'U2FsdGVkX18kqQVkl8zGUA8schCVAm6NWNM0q/bCV7dHyUJoy8JPbRms4IIsFNU4Ahx6ffx0FVYsOIatS98WjA==',
  "U2FsdGVkX18y9RiV+sdQG+dNc09ETZfLddhx6sEu10zP07S14C9X4cdXXRtwJ+Pa+x2zycwllBLV9opSgQ9Cjg=="
];

export const PROCESS_STAGE = {
  INIT: 'INIT',
  VALIDATE_OTP: 'VALIDATE_OTP',
  FETCH_BENEFICIARY: 'FETCH_BENEFICIARY',
  FETCH_SLOTS: 'FETCH_SLOTS',
  SCHEDULE: 'SCHEDULE',
  SLOT_BOOKED: 'SLOT_BOOKED',
  ERROR: 'ERROR',
  EXISTING_BOOKING: 'EXISTING_BOOKING',
  BOOKING_FAILED: 'BOOKING_FAILED',
  VACCINATED: 'VACCINATED',
  REGISTERED: 'REGISTERED',
  NOT_REGISTERED: 'NOT_REGISTERED',
  ALTERNATE_PHONE_INIT: 'ALTERNATE_PHONE_INIT',
  CONFIRM_PHONE: 'CONFIRM_PHONE'
};

export const API_URLS = {
  [PROCESS_STAGE.INIT]: 'https://cdn-api.co-vin.in/api/v2/auth/generateMobileOTP',
  [PROCESS_STAGE.VALIDATE_OTP]: 'https://cdn-api.co-vin.in/api/v2/auth/validateMobileOtp',
  [PROCESS_STAGE.FETCH_BENEFICIARY]: 'https://cdn-api.co-vin.in/api/v2/appointment/beneficiaries',
  [PROCESS_STAGE.SCHEDULE]: 'https://cdn-api.co-vin.in/api/v2/appointment/schedule',
  [PROCESS_STAGE.FETCH_SLOTS]: 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByDistrict',
  'RESCHEDULE': 'https://cdn-api.co-vin.in/api/v2/appointment/reschedule',
};

export const ALLOWED_NAME_EDITS = 3;

export const SLOT_FILTER = {
  MIN_AGE: 18,
  MIN_CAPACITY: 5
};

export const VACCINE_SECOND_DOSE_BUFFER_DAYS = {
  'COVISHIELD': 84,
  'COVAXIN': 28,
  'SPUTNIK V': 21,
};

export const DOSE_TYPE = {
  FIRST: 1,
  SECOND: 2,
};

export const ERROR_CODE = {
  NO_BENEFICIARY: 'NO_BENEFICIARY',
  NO_SLOT: 'NO_SLOT',
  INVALID_OTP: 'INVALID_OTP',
  EXISTING_BOOKING: 'EXISTING_BOOKING',
  BOOKING_FAILED: 'BOOKING_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_PHONE: 'INVALID_PHONE'
};

export const COWIN_ERROR_CODE = {
  [ERROR_CODE.EXISTING_BOOKING]: 'APPOIN0022',
  [ERROR_CODE.INVALID_OTP]: 'USRAUT0014',
  [ERROR_CODE.NO_BENEFICIARY]: 'APPOIN0001'
};

export const OTP_RETRY_TIME = 120;

export const MAX_BOOKING_ATTEMPT = 2;

export const ID_TYPE = {
  'Aadhaar Card': 'aadhaar_card',
  'PAN Card': 'pan_card'
};

export const VACCINE_TYPE = {
  FREE: 'Free',
  PAID: 'Paid'
}

export const FREE_SLOT_THRESHOLD = 15;
export const VACCINE_FEE_THRESHOLD = 1000;
export const DEFAULT_VACCINE_FOR_FIRST_DOSE = 'COVISHIELD';

export const SLOT_CUTOFF_HOUR = 15;

export const INVALID_PHONE_REASONS_TEXT = {
  SAME_AS_LAST: 'New phone number can\'t be same as last',
  DEFAULT: 'Please enter a valid phone number'
};

export const DEFAULT_AUTO_CALLBACK_STATE = {
  callBackDelayInSeconds: 15,
  isTimerOn: false
};

export const MAX_BENEFICIARY_ALLOWED = 5;
