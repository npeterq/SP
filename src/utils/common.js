let getApiBase = function () {
  if (location.hostname === '' + location.host + '') {
    return 'http://' + location.host + ':7009/api'
  } else {
    return 'http://' + location.host + '7009/api'
  }
}

function trim(str) {
  return str.replace(/^\s+/, '')
}

export {
  getApiBase,
  trim
}