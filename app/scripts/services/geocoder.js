'use strict';

/* global google */

angular.module('ctm.geocoder', ['ui.bootstrap', 'geolocation', 'ctm.filters'])
.factory('Geocoder', ['$q', '$filter', function ($q, $filter) {

    var geocode = function (options) {
      var deferred = $q.defer();
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode(options, function (results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
          deferred.resolve(results);
        } else {
          deferred.reject('Geocoder failed due to: ' + status);
        }
      });
      return deferred.promise;
    };

    var filterResults = function (results, customFormat) {
      
      customFormat = customFormat | false;
      
      var locations = [];

      angular.forEach(results, function (result) {
        var location = {
          //address: result.formatted_address, 
          coordinates: {
	latitude: result.geometry.location.lat(), 
	longitude: result.geometry.location.lng()
          }
        };

        var addresses = [];
        
        angular.forEach(result.address_components, function (component) {
          if ($filter('hasValue')(component.types, 'political') && $filter('hasValue')(component.types, 'country')) {
	angular.extend(location, {country: component.short_name});
	addresses.push(component.long_name);
          } else if ($filter('hasValue')(component.types, 'political') && $filter('hasValue')(component.types, 'locality')) {
	angular.extend(location, {city: component.short_name});
	addresses.push(component.short_name);
          } else if ($filter('hasValue')(component.types, 'sublocality_level_2') && $filter('hasValue')(component.types, 'political') && $filter('hasValue')(component.types, 'sublocality')) {
	angular.extend(location, {sublocal: component.short_name});
	addresses.push(component.short_name);
          }
          
        });
        
        if(!customFormat) {
          angular.extend(location, {address: result.formatted_address});
        } else {
          angular.extend(location, {address: addresses.join(', ')});
        }
        locations.push(location);
      });

      return locations;
    };

    return {
      geocode: geocode,
      getLocationsByString: function (search) {
        var deferred = $q.defer();

        geocode({'componentRestrictions': {'locality': search}}).then(function (results) {
          var locations = filterResults(results);
          deferred.resolve(locations);
        });

        return deferred.promise;
      },
      getLocationsByCoords: function (lat, lon) {
        var deferred = $q.defer();
        var latlng = new google.maps.LatLng(lat, lon);

        geocode({latLng: latlng}).then(function (results) {
          var locations = filterResults(results, true);
          deferred.resolve(locations);
        });

        return deferred.promise;
      }
    };
  }])
.controller('GeocoderCtrl', ['$rootScope', '$scope', '$http', 'Geocoder', 'geolocation', function ($rootScope, $scope, $http, Geocoder, geolocation) {

    var geo = null;
    $scope.locations = [];

    $scope.getLocations = function (search) {
      return Geocoder.getLocationsByString(search).then(function (locations) {
        $scope.locations = locations;
        return locations;
      });
    };

    if (geo === null) {
      $http.jsonp('http://ajaxhttpheaders.appspot.com?callback=JSON_CALLBACK').success(function (response) {
        
        $scope.address = response['X-Appengine-City'];
        var latLon = response['X-Appengine-Citylatlong'].split(',');
        $rootScope.map = {
          center: {latitude: latLon[0], longitude: latLon[1]},
        };
        
      });
    }

    $scope.locate = function () {
      
      var element = angular.element(document.getElementById('city'));
      
      $scope.city = '';
      element.val('');
      geolocation.getLocation().then(function (data) {
        $rootScope.map = {
          center: {latitude: data.coords.latitude, longitude: data.coords.longitude},
        };
        
        setMarker(data.coords);
        
        Geocoder.getLocationsByCoords(data.coords.latitude, data.coords.longitude).then(function (locations) {
          $scope.locations = locations;
          $scope.city = locations[0].address;
          element.val($scope.city);
        });

      });
    };

    $scope.selected = function ($item) {
      $rootScope.map = {
        center: $item.coordinates,
      };
      
      setMarker($item.coordinates);
    };
    
    var setMarker = function(coords) {
      $rootScope.marker = {
        coords: coords
      };
    };

  }])
/*.directive('geocoder', function ($modal) {
  
  var ModalController = function() {};

  return {
    restrict: 'A',
    replace: true,
    require: 'ngModel',
    scope: {
      location: '=geocoderLocationModel'
    },
    link: function (scope, element, attrs, ngModel) {

      element.bind('focus', function () {
        $modal.open({
          templateUrl: 'views/geocoder-modal.html',
          controller: ModalController,
          size: 'lg'
        }).result.then(function (location) {
          ngModel.$setViewValue(location[0].address);
          element.val(location[0].address);
          scope.location = location[0];
        });
      });


    }
  };
})*/
;