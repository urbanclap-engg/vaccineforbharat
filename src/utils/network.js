const HTTP_NO_CONTENT = 204;
export const makePostCall = async (path, body, stateCallback, token) => {
  stateCallback({ isLoading: true });
  return Promise.resolve()
  .then(() => {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    })
  })
  .then((response) => {
    if(response.status === 204) return {};
    return response.json();
  })
  .then((data) => {
    stateCallback({ isLoading: false });
    if (data.error) {
      throw data;
    }
    return data;
  })
  .catch(data => {
    stateCallback({ errorObj: {code: data.errorCode, message: data.error }, isLoading: false });
    throw data;
  });
};

export const makeGetCall = async (path, stateCallback, token) => {
  stateCallback({ isLoading: true });
  return Promise.resolve()
  .then(() => {
    return fetch(path, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` }
    })
  })
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    stateCallback({ isLoading: false });
    if (data.error) {
      throw data;
    }
    return data;
  })
  .catch(data => {
    stateCallback({ errorObj: {code: data.errorCode, message: data.error }, isLoading: false });
    throw data;
  });
};
