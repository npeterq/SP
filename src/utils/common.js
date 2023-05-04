let getApiBase = function () {
  if (location.hostname === '108.174.200.30') {
    return 'http://108.174.200.30:7009/api'
  } else {
    return 'http://localhost:7009/api'
  }
}

function trim(str) {
  return str.replace(/^\s+/, '')
}

export {
  getApiBase,
  trim
}