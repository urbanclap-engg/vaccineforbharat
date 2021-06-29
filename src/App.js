import React, { useState, useEffect } from 'react';
import { withRouter } from "react-router";
import * as _ from 'lodash';
import { SECRET_KEYS, PROCESS_STAGE, API_URLS, ERROR_CODE, COWIN_ERROR_CODE,
  OTP_RETRY_TIME, MAX_BOOKING_ATTEMPT, INVALID_PHONE_REASONS_TEXT, DEFAULT_AUTO_CALLBACK_STATE } from './constants';
import Card from '@material-ui/core/Card';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';
import { makePostCall } from './utils/network';
import { fetchBenficiaries } from './booking/beneficiary';
import { fetchSlots } from './booking/slot';
import { getSearchParamsFromUrl } from './utils/queryParams';
import { triggerCallback } from './webCallback';
import Image from './assests/build4bharat.jpg';
import Box from '@material-ui/core/Box';
import { renderOtpStage, renderCaptchStage, renderSuccessStage, renderExistingBookingStage,
  renderBookingFailedStage, renderVaccinatedStage, renderErrorStage, renderRegisteredStage,
  renderNotRegiseteredState, renderAlternatePhoneInitState, renderPhoneNumberConfirmation } from './stateView';
const shajs = require('sha.js');

const useStyles = makeStyles({
  root: {
    backgroundColor: '#B2EBFE',
    width: '100%'
  },
  image: {
    overflowY: 'hidden',
    width: '100%'
  },
  card: {
    flexGrow: 1,
    width: '90%',
    minHeight: '25%',
    margin: 'auto',
    padding: '5%',
    position: 'absolute',
    bottom: 0
  },
  button: {
    marginTop: 10,
    borderRadius: 12
  },
  goHomeButton: {
    marginTop: 20
  },
  body: {
    marginTop: '5%',
  }
});

function getRandomSecretKey() {
  const index = parseInt((Math.random()*10))%6;
  return SECRET_KEYS[index];
}

function App(props) {
  const searchParams = getSearchParamsFromUrl(props.location.search);
  const initialStage = _.isEmpty(searchParams.phone) ? PROCESS_STAGE.ALTERNATE_PHONE_INIT : PROCESS_STAGE.INIT;
  const [state, setState] = useState({...searchParams,
    stage: initialStage, otp: '', registeredPhone: _.get(searchParams, 'phone'),
    lastPhone: _.get(searchParams, 'phone'), registeredBeneficiaryList: [] });
  const [retryTime, setRetryTime] = useState(OTP_RETRY_TIME);
  const [bookingAttempt, setBookingAttempt] = useState(1);
  const [autoCallBackState, setAutoCallBackState] = useState(DEFAULT_AUTO_CALLBACK_STATE);

  const stateCallback = (updatedState) => {
    setState({...state, ...updatedState});
  };
  const changeOtp = (otp) => {
    setState({...state, otp});
  };

  const triggerOtp = async () => {
    const secretKey = getRandomSecretKey();
    setRetryTime(OTP_RETRY_TIME);
    try {
      const data = await makePostCall(API_URLS.INIT, {
        "mobile": state.registeredPhone,
        "secret": secretKey
      }, stateCallback);
      setState({...state, txnId: data.txnId, stage: PROCESS_STAGE.VALIDATE_OTP});
    } catch(err) {
      
    }
  };
  const submitOtp = async () => {
    const otpHash = shajs('sha256').update(state.otp).digest('hex');
    try {
      const data = await makePostCall(API_URLS.VALIDATE_OTP, {
        "otp": otpHash,
        "txnId": state.txnId
      }, stateCallback);
      setState({...state, token: data.token, errorObj: {}, stage: PROCESS_STAGE.FETCH_BENEFICIARY });
    } catch(err) {
    }
  };

  const scheduleSlot = async () => {
    try {
      const data = await makePostCall(API_URLS.SCHEDULE, {
        "beneficiaries": [state.beneficiaryDetails.beneficiary_reference_id],
        "center_id": state.vaccineSlot.center_id,
        "slot": state.vaccineSlot.slot_time,
        "session_id": state.vaccineSlot.session_id,
        "dose": _.isEmpty(state.beneficiaryDetails.dose1_date)?1:2
      }, stateCallback, state.token);
      const appointmentId = _.get(data, 'appointment_confirmation_no');
      if (!_.isEmpty(appointmentId)) {
        setState({...state, errorObj:{}, stage: PROCESS_STAGE.SLOT_BOOKED, appointmentId })
      } else {
        setState({...state, errorObj:{ code: ERROR_CODE.BOOKING_FAILED, message: 'Appointment not confirmed' } })
      }
    } catch(err) {
    }
  };

  const changeRegisteredPhone = (registeredPhone) => {
    setState({ ...state, registeredPhone });
  };

  const submitRegisteredPhone =  () => {
    const activePhone = state.registeredPhone;
    if (_.size(activePhone) !== 10) {
      setState({ ...state, errorObj: {
        code: ERROR_CODE.INVALID_PHONE,
        message: INVALID_PHONE_REASONS_TEXT.DEFAULT
      }});
      return;
    }

    setState({ ...state, stage: PROCESS_STAGE.INIT, lastPhone: state.registeredPhone });
  };

  const enterAlternatePhoneInitStage = () => {
    setState({ ...state, 
      stage: PROCESS_STAGE.ALTERNATE_PHONE_INIT,
      otp: '',
      errorObj: null,
      registeredPhone: ''
    });
  };

  const confirmRegisteredPhone = () => {
    setState({ ...state,
      stage: PROCESS_STAGE.CONFIRM_PHONE
    });
  }

  const goToHome = () => {
    triggerCallback(state, 0);
  };

  const renderErrorItem = () => {
    if (_.isEmpty(_.get(state.errorObj, 'message')) || _.get(state, 'stage') === PROCESS_STAGE.NOT_REGISTERED) {
      return null;
    }
    return (
      <Grid alignItems="center" justify="center">
        <Grid item lg={12}>
        <Typography color="error">
          <Box fontWeight="fontWeightBold">
            {state.errorObj.message}
          </Box>
          </Typography>
        </Grid>
      </Grid>
    )
  };
  const getRenderView = (classes) => {
      switch(state.stage) {
      case PROCESS_STAGE.SLOT_BOOKED:
        return renderSuccessStage(classes);
      case PROCESS_STAGE.VACCINATED:
        return renderVaccinatedStage(classes);  
      case PROCESS_STAGE.EXISTING_BOOKING:
        return renderExistingBookingStage({ classes, enterAlternatePhoneInitStage,
          goToHome, autoCallBackState });
      case PROCESS_STAGE.BOOKING_FAILED:
        return renderBookingFailedStage(state, bookingAttempt, classes);
      case PROCESS_STAGE.ERROR:
        return renderErrorStage(state, classes);
      case PROCESS_STAGE.REGISTERED:
        return renderRegisteredStage({ classes, registeredPhone: state.registeredPhone,
          enterAlternatePhoneInitStage, goToHome, autoCallBackState });
      case PROCESS_STAGE.NOT_REGISTERED:
        return renderNotRegiseteredState({ classes, registeredPhone: state.registeredPhone, 
          enterAlternatePhoneInitStage, goToHome, autoCallBackState });
      case PROCESS_STAGE.ALTERNATE_PHONE_INIT:
        return renderAlternatePhoneInitState(classes, state, submitRegisteredPhone, changeRegisteredPhone, confirmRegisteredPhone);
      case PROCESS_STAGE.CONFIRM_PHONE:
        return renderPhoneNumberConfirmation(classes, state, submitRegisteredPhone, enterAlternatePhoneInitStage);
      default:
        return renderOtpStage({state, retryTime, classes, changeOtp, submitOtp, triggerOtp, enterAlternatePhoneInitStage});
    }
  }
  const handleBookingFailure = () => {
    setState({...state, errorObj: {}, stage: PROCESS_STAGE.BOOKING_FAILED});
    if (bookingAttempt < MAX_BOOKING_ATTEMPT) {
      const intervalId = setTimeout(() => {
        setBookingAttempt(bookingAttempt+1);
      }, 3000);
      return () => clearInterval(intervalId);
    } else {
      triggerCallback({...state, stage: PROCESS_STAGE.BOOKING_FAILED});
    }
  };
  useEffect(() => {
    switch(state.stage) {
      case PROCESS_STAGE.INIT:
        if (state.registeredPhone) {
          triggerOtp();
        }
        break;
      case PROCESS_STAGE.FETCH_BENEFICIARY:
        fetchBenficiaries(state, stateCallback);
        break;
      case PROCESS_STAGE.FETCH_SLOTS:
        fetchSlots(state, stateCallback);
        break;
      case PROCESS_STAGE.SCHEDULE:
        scheduleSlot(state, stateCallback);
      case PROCESS_STAGE.SLOT_BOOKED:
      case PROCESS_STAGE.VACCINATED:
      case PROCESS_STAGE.ERROR:
        triggerCallback(state);
        break;
      case PROCESS_STAGE.NOT_REGISTERED:
      case PROCESS_STAGE.REGISTERED:
      case PROCESS_STAGE.EXISTING_BOOKING:
        setAutoCallBackState({ ...DEFAULT_AUTO_CALLBACK_STATE, isTimerOn: true });
        return;
      default:
        break;
    }

    setAutoCallBackState(DEFAULT_AUTO_CALLBACK_STATE);
  }, [state.stage]);
  useEffect(() => {
    const code = _.get(state.errorObj, 'code');
    if (!code) {
      return;
    }

    switch (state.stage) {
      case PROCESS_STAGE.FETCH_BENEFICIARY:
        setState({ ...state, stage: PROCESS_STAGE.NOT_REGISTERED });
        return;
      default: break;
    };

    switch(state.errorObj.code) {
      case ERROR_CODE.INVALID_PHONE:
        return;
      case COWIN_ERROR_CODE[ERROR_CODE.INVALID_OTP]:
        return;
      case COWIN_ERROR_CODE[ERROR_CODE.EXISTING_BOOKING]:
        setState({...state, stage: PROCESS_STAGE.EXISTING_BOOKING });
        return;
      case COWIN_ERROR_CODE[ERROR_CODE.NO_BENEFICIARY]:
        setState({ ...state, stage: PROCESS_STAGE.NOT_REGISTERED });
        return;
      case ERROR_CODE.NO_SLOT:
        handleBookingFailure();
        return;
      case ERROR_CODE.NO_BENEFICIARY:
        return;
      default:
        if (state.stage === PROCESS_STAGE.SCHEDULE) {
          handleBookingFailure();
        } else {
          setState({...state, stage: PROCESS_STAGE.ERROR });
        }
       return;
    };
  }, [state.errorObj]);
  useEffect(() => {
    if (!retryTime) return;
    const intervalId = setTimeout(() => {
      setRetryTime(retryTime-1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [retryTime])
  useEffect(() => {
    if (state.stage === PROCESS_STAGE.BOOKING_FAILED) {
      setState({...state, errorObj: {}, captcha:'', stage: PROCESS_STAGE.FETCH_SLOTS});
    }
  }, [bookingAttempt])
  useEffect(() => {
    if (!autoCallBackState.isTimerOn) {
      return;
    }
    if (autoCallBackState.callBackDelayInSeconds <= 0) {
      triggerCallback(state, 0);
      return;
    }

    const intervalId = setTimeout(() => {
      setAutoCallBackState({
        ...autoCallBackState,
        callBackDelayInSeconds: autoCallBackState.callBackDelayInSeconds - 1
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [autoCallBackState])

  const classes = useStyles();
  const renderView = getRenderView(classes);
  const errorItem = renderErrorItem(); 
  return (
    <div className={classes.root}>
      <img src={`${Image}`} className={classes.image} />
      <Card className={classes.card}>
        {errorItem}
        {state.isLoading && <CircularProgress />}
        {renderView}
      </Card>
    </div>
  );
}

export default withRouter(App);
