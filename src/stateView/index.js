import React from 'react';
import * as _ from 'lodash';
import { OTP_RETRY_TIME, MAX_BOOKING_ATTEMPT, ERROR_CODE, COWIN_ERROR_CODE, PROCESS_STAGE } from '../constants';
import {ReactComponent as QuestionIcon} from "../assests/questionMark.svg";
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';
import CircularProgress from '@material-ui/core/CircularProgress';
import { getMinuteString } from '../utils/stringUtils';
import Box from '@material-ui/core/Box';
import SvgIcon from "@material-ui/core/SvgIcon";

const getRedirectElement = (classes) => {
  return (<div className={classes.body}>
    <Typography>
    ⌛ Taking you back...
    </Typography>
  </div>)
};

const getRetryElement = (classes) => {
  return (<div className={classes.body}>
    <Typography>
    ⌛ Retrying some other slot...
    </Typography>
  </div>)
};

const getAlternateNumberElement = (classes, enterAlternatePhoneInitStage, goToHome) => {
  return (<div>
    <Grid container justify="center" alignItems="center" direction="column">
      <Button className={classes.button}
        variant="contained"
        color="primary"
        fullWidth={true}
        onClick={enterAlternatePhoneInitStage}>
          <Typography variant="subtitle2">
            Vaccinated on different number?
          </Typography>
      </Button>
      <Button className={classes.goHomeButton}
        variant="outlined"
        color="primary"
        fullWidth={true}
        onClick={goToHome}>
          <Typography variant="subtitle2">
            Go to home
          </Typography>
      </Button>
    </Grid>
  </div>);
};

export const renderOtpStage = (params) => {
  const { state, retryTime, classes, changeOtp, submitOtp, triggerOtp, enterAlternatePhoneInitStage } = params;
  const retryEnabled = (retryTime < 1);
  const retryTimeString = getMinuteString(retryTime);
  return (
    <Grid alignItems="center" justify="center">
      <Grid item lg={12}>
        <Typography variant="body2">
          <Box fontWeight="fontWeightBold">
            LOGIN
          </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        <Typography variant="h6">
        <Box fontWeight="fontWeightBold">
          Enter OTP
        </Box>
        </Typography>
        <Typography variant='subtitle2'>
          <Box my={2}>
            <Box>
              OTP sent to {state.registeredPhone}
            </Box>
            <Link onClick={enterAlternatePhoneInitStage}>
              Vaccine registered on different number?
            </Link>
          </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        <TextField maxLength={6} type="number" id="otp" label="6-digit OTP" variant="outlined" value={state.otp} onChange={e => changeOtp(e.target.value)} />
      </Grid>
      <Grid container justify="space-between">
        <Grid item lg={6}>
        <Button className={classes.button} id="otp" variant="contained" color="primary" onClick={submitOtp}
          disabled={state.isLoading}>
          Submit OTP
        </Button>
        </Grid>
        <Grid item lg={6}>
        <Button className={classes.button} id="otp" variant="contained"
          color={retryEnabled?"primary":"default"}
          onClick={triggerOtp}
          disabled={!retryEnabled || state.isLoading}>
          {`Retry ${retryEnabled?'':'('+retryTimeString+')'}`}
        </Button>
        </Grid>
      </Grid>
    </Grid>
  )
};

export const renderSuccessStage = (classes) => {
  return (
    <Grid alignItems="center" justify="center">
      <Grid item lg={12}>
        <Typography variant="body2">
          <Box fontWeight="fontWeightBold" color="success.main">
            SLOT BOOKED
          </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        <Typography variant="h6">
        <Box fontWeight="fontWeightBold">
          Your vaccinated slot has been booked
        </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        {getRedirectElement(classes)}
      </Grid>
    </Grid>
  )
};

export const renderVaccinatedStage = (classes) => {
  return (
    <Grid alignItems="center" justify="center">
      <Grid item lg={12}>
        <Typography variant="body2">
          <Box fontWeight="fontWeightBold" color="success.main">
            VACCINATED
          </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        <Typography variant="h6">
        <Box fontWeight="fontWeightBold">
          You have been vaccinated
        </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        {getRedirectElement(classes)}
      </Grid>
    </Grid>
  )
};

export const renderExistingBookingStage = ({ classes, enterAlternatePhoneInitStage,
  goToHome, autoCallBackState }) => {
    const alternateNumberElement = getAlternateNumberElement(classes, enterAlternatePhoneInitStage, goToHome);
    return (
    <Grid alignItems="center" justify="center">
      <Grid item lg={12}>
        <Typography variant="body2">
          <Box fontWeight="fontWeightBold" color="success.main">
            SLOT BOOKED
          </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        <Typography variant="h6">
        <Box fontWeight="fontWeightBold">
          You have a slot booking
        </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        {autoCallBackState.isTimerOn &&
          <Typography>
            ⌛ Taking you back in {autoCallBackState.callBackDelayInSeconds}
          </Typography>}
      </Grid>
      {alternateNumberElement}
    </Grid>
  )
};

const getBookingActionElement = (bookingAttempt, classes) => {
  if (bookingAttempt < MAX_BOOKING_ATTEMPT) {
    return getRetryElement(classes);
  }
  return getRedirectElement(classes);
}

export const renderBookingFailedStage = (state, bookingAttempt, classes) => {
  const bookingActionElement = getBookingActionElement(bookingAttempt, classes);

  return (
    <Grid alignItems="center" justify="center">
      <Grid item lg={12}>
        <Typography variant="body2">
          <Box fontWeight="fontWeightBold" color="secondary.main">
            BOOKING FAILED
          </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        <Typography variant="h6">
        <Box fontWeight="fontWeightBold">
          All slots booked before your booking
        </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        {bookingActionElement}
      </Grid>
    </Grid>
  )
};

const getErrorMessage = (state) => {
  const errCode = _.get(state.errorObj, 'code');
  if (errCode === ERROR_CODE.NO_BENEFICIARY || errCode === COWIN_ERROR_CODE.NO_BENEFICIARY) {
    return (<Typography variant="h6">
    <Box fontWeight="fontWeightBold">
      Your registration on CoWin Portal is pending.
      Please register first so that you can book slots.
    </Box>
    </Typography>);
  }
  return (<Typography variant="body2">
    <Box fontWeight="fontWeightBold" color="secondary.main">
      SOMETHING WENT WRONG
    </Box>
  </Typography>);
};

export const renderErrorStage = (state, classes) => {
  const errorMessage = getErrorMessage(state);
  return (
    <Grid alignItems="center" justify="center">
      <Grid item lg={12}>
        {errorMessage}
      </Grid>
      <Grid item lg={12}>
        {getRedirectElement(classes)}
      </Grid>
    </Grid>
  )
};

export const renderRegisteredStage = ({ classes, enterAlternatePhoneInitStage,
  goToHome, autoCallBackState }) => {
  const alternateNumberElement = getAlternateNumberElement(classes, enterAlternatePhoneInitStage, goToHome);
  return (
    <Grid alignItems="center" justify="center">
      <Grid item lg={12}>
        <Typography variant="body2">
          <Box fontWeight="fontWeightBold" color="success.main">
            STATUS CONFIRMED
          </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        <Typography variant="h6">
        <Box fontWeight="fontWeightBold">
          You have registered on CoWin portal. Please book a slot for vaccination soon.
        </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        {autoCallBackState.isTimerOn &&
          <Typography>
            ⌛ Taking you back in {autoCallBackState.callBackDelayInSeconds}
          </Typography>}
      </Grid>
      {alternateNumberElement}
    </Grid>
  )
};

export const renderNotRegiseteredState = (params) => {
  const { classes, registeredPhone, enterAlternatePhoneInitStage, goToHome, autoCallBackState } = params;
  const alternateNumberElement = getAlternateNumberElement(classes, enterAlternatePhoneInitStage, goToHome);
  return (
    <Grid alignItems="center" justify="center">
      <Grid item lg={12}>
        <Typography variant="subtitle2">
          <Box color="#FF0000" fontWeight="fontWeightBold">
            Vaccination pending
          </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        <Typography variant="h6">
            <Box fontWeight="fontWeightBold" my={2}>
              No vaccination registration found for {registeredPhone}
              {autoCallBackState.isTimerOn &&
                <Typography>
                  ⌛ Taking you back in {autoCallBackState.callBackDelayInSeconds}
                </Typography>
              }
            </Box>
        </Typography>
      </Grid>
      {alternateNumberElement}
    </Grid>
  )
};

export const renderAlternatePhoneInitState = (classes, state, submitRegisteredPhone, changeRegisteredPhone, confirmRegisteredPhone) => {
  return (
    <Grid alignItems="center" justify="center" direction="column">
      <Grid item lg={12}>
        <Typography variant="h6">
            <Box fontWeight="fontWeightBold" my={2}>
              Enter phone number used for Vaccination
            </Box>
        </Typography>
      </Grid>
      <Grid item lg={12}>
        <TextField
          maxLength={10}
          fullWidth={true}
          size="small"
          type="number"
          id="alternatePhone"
          label="Vaccination Phone Number"
          variant="outlined"
          value={state.registeredPhone}
          onChange={e => changeRegisteredPhone(e.target.value)}
        />
      </Grid>
      <Grid item lg={12}>
        <Button className={classes.button}
          variant="contained"
          color="primary"
          fullWidth={true}
          id="confirmRegisteredPhone"
          onClick={confirmRegisteredPhone}>
          <Typography variant="subtitle1">
              Send OTP
          </Typography>
        </Button>
      </Grid>
    </Grid>
  )
};

export const renderPhoneNumberConfirmation = (classes, state, submitRegisteredPhone, enterAlternatePhoneInitStage) => {
  return (
    <Grid container alignItems="center" justify="center" direction="column">
      <Grid item lg={12} justify="center">
        <SvgIcon component={QuestionIcon} overflow="visible" />
      </Grid>
      <Grid item lg={12}>
        <Typography variant="h6">
          <Box fontWeight="fontWeightBold" my={2}>
            Are you sure you used {state.registeredPhone} for Vaccination?
          </Box>
        </Typography>
      </Grid>
      <Grid container direction="row" justify="space-between" spacing={1}>
        <Grid item xs={6}>
          <Button className={classes.button}
            variant="outlined"
            color="primary"
            fullWidth={true}
            id="submitRegisteredPhone"
            onClick={submitRegisteredPhone}>
            <Typography variant="subtitle2">
              Yes
            </Typography>
          </Button>
        </Grid>
        <Grid item xs={6}>
          <Button className={classes.button}
            variant="outlined"
            color="primary"
            fullWidth={true}
            id="declineRegisteredPhone"
            onClick={enterAlternatePhoneInitStage}>
            <Typography variant="subtitle2">
              No
            </Typography>
          </Button>
        </Grid>
      </Grid>
    </Grid>
  )
};