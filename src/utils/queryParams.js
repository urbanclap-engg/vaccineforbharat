import * as qs from 'qs';

export function getSearchParamsFromUrl(queryString) {
  const searchParams = qs.parse(queryString, { ignoreQueryPrefix: true });
  return searchParams || {};
}

export function getUrlParamsFromObj(obj) {
  const urlParams = qs.stringify(obj);
  return urlParams;
}