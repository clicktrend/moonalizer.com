'use strict';

angular.module('ctm.filters', [])
.filter('hasValue', function () {
  return function (inputs, values) {
    
    if(!angular.isArray(inputs)) {
      inputs = [inputs];
    }
    
    if(!angular.isArray(values)) {
      values = [values];
    }
    
    for (var i = 0; i < inputs.length; i++) {
      for (var j = 0; j < values.length; j++) {
        if (inputs[i] === values[j]) {
          return true;
        }
      }
    }

    return false;
  };
})
;