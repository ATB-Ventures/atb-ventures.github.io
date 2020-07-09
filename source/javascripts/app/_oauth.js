function stringifyURL(obj) {
  return obj
    ? Object.keys(obj)
        .sort()
        .map(function (key) {
          var val = obj[key];

          if (Array.isArray(val)) {
            return val
              .sort()
              .map(function (val2) {
                return encodeURIComponent(key) + "=" + encodeURIComponent(val2);
              })
              .join("&");
          }

          return encodeURIComponent(key) + "=" + encodeURIComponent(val);
        })
        .join("&")
    : "";
}

// dec2hex :: Integer -> String
// i.e. 0-255 -> '00'-'ff'
function dec2hex(dec) {
  return dec < 10 ? "0" + String(dec) : dec.toString(16);
}

// generateId :: Integer -> String
function generateId(len) {
  var arr = new Uint8Array((len || 40) / 2);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, dec2hex).join("");
}

const DEFAULT_SCOPE = "openid profile email";
const DEFAULT_RESPONSE_TYPE = "code";
const DEFAULT_GRANT_TYPE = "authorization_code";
const DEFAULT_REDIRECT_URI =
  window.location.protocol + "//" + window.location.host;
const DEFAULT_AUDIENCE = "";
const DEFAULT_AUTHORIZE_ROUTE = "authorize";
const DEFAULT_TOKEN_ROUTE = "oauth/token";

function oauthSetup(oauthConfig) {
  if (!oauthConfig.client_id && !oauthConfig.domain) {
    throw new Error("No client ID present in oauth config");
  }

  var params = localStorage.getItem("oauth");
  if (!params) {
    params = {
      domain: oauthConfig.domain,
      response_type: oauthConfig.response_type || DEFAULT_RESPONSE_TYPE,
      client_id: oauthConfig.client_id,
      redirect_uri: oauthConfig.redirect_uri || DEFAULT_REDIRECT_URI,
      scope: oauthConfig.scope || DEFAULT_SCOPE,
      state: generateId(32),
      audience: oauthConfig.audience || DEFAULT_AUDIENCE,
    };
    localStorage.setItem("oauth", JSON.stringify(params));
  } else {
    params = JSON.parse(params);
  }

  var data = Object.assign({}, params);
  delete data.domain;
  var oauth_authorize_uri =
    params.domain + DEFAULT_AUTHORIZE_ROUTE + "?" + stringifyURL(data);

  $(".authorize-link").each(function (i, obj) {
    $(obj).attr("href", oauth_authorize_uri);
  });
}

function oauthCodeExchange() {
  var params = localStorage.getItem("oauth");
  if (!params) {
    return;
  }

  var paramsParsed = JSON.parse(params);
  var sentState = paramsParsed.state;
  var isValid, qp, arr;

  if (/code|token|error/.test(window.location.hash)) {
    qp = window.location.hash.substring(1);
  } else {
    qp = location.search.substring(1);
  }

  arr = qp.split("&");
  if (arr.length <= 1) {
    return;
  }
  arr.forEach(function (v, i, _arr) {
    _arr[i] = '"' + v.replace("=", '":"') + '"';
  });
  qp = qp
    ? JSON.parse("{" + arr.join() + "}", function (key, value) {
        return key === "" ? value : decodeURIComponent(value);
      })
    : {};

  isValid = qp.state === sentState;

  try {
    if (!isValid) {
      throw new Error(
        "Authorization may be unsafe, passed state was changed in server Passed state wasn't returned from auth server"
      );
    }

    if (qp.code) {
      var data = {
        grant_type: DEFAULT_GRANT_TYPE,
        client_id: paramsParsed.client_id,
        redirect_uri: paramsParsed.redirect_uri,
        code: qp.code,
      };
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          var response = JSON.parse(xhr.response);
          if (response && response.access_token) {
            $(".content")
              .contents()
              .each(function () {
                if (this.nodeType === 3)
                  this.nodeValue = $.trim($(this).text()).replace(
                    /replacemetoken/g,
                    response.access_token
                  );
                if (this.nodeType === 1)
                  $(this).html(
                    $(this)
                      .html()
                      .replace(/replacemetoken/g, response.access_token)
                  );
              });
          }
        }
      };
      xhr.open("POST", paramsParsed.domain + DEFAULT_TOKEN_ROUTE, true);
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.send(stringifyURL(data));
      localStorage.removeItem("oauth");
    } else {
      var oauthErrorMsg;
      if (qp.error) {
        oauthErrorMsg =
          "[" +
          qp.error +
          "]: " +
          (qp.error_description
            ? qp.error_description + ". "
            : "no accessCode received from the server. ") +
          (qp.error_uri ? "More info: " + qp.error_uri : "");
      }

      throw new Error(
        oauthErrorMsg ||
          "[Authorization failed]: no accessCode received from the server"
      );
    }
  } catch (error) {
    console.log(JSON.stringify(error));
  } finally {
    window.history.replaceState({}, document.title, "/");
    localStorage.removeItem("oauth");
    oauthSetup({
      domain: paramsParsed.domain,
      client_id: paramsParsed.client_id,
      audience: paramsParsed.audience,
      response_type: paramsParsed.response_type,
      scope: paramsParsed.scope,
      redirect_uri: paramsParsed.redirect_uri,
    });
  }
}
