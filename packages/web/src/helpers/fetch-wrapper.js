function handleResponse(response) {
  return response.text().then((text) => {
    let data = text;

    try {
      data = JSON.parse(text);
    } catch (error) {
      data = text;
    }

    if (!response.ok) {
      if ([401, 403].includes(response.status)) {
        // auto logout if 401 Unauthorized or 403 Forbidden response returned from api
      }

      // const error = (data && data.message) || response.statusText;
      const error = data || response.statusText;

      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject({ status: response.status, error });
    }

    return data;
  });
}

function get(url, token = undefined) {
  const requestOptions = {
    method: 'GET',
  };

  if (token !== undefined) {
    requestOptions.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  return fetch(url, requestOptions).then(handleResponse);
}

function getRaw(url) {
  const requestOptions = {
    method: 'GET',
  };

  return fetch(url, requestOptions).then(handleResponse);
}

function post(url, body, token = undefined) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };

  if (token !== undefined) {
    requestOptions.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  return fetch(url, requestOptions).then(handleResponse);
}

export const fetchWrapper = {
  get,
  post,
  getRaw,
};
