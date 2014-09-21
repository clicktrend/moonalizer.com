'use strict';

angular.module('app', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'pascalprecht.translate',
  'ui.bootstrap',
  'geolocation',
  'google-maps',
  'nvd3',
  'ctm.geocoder',
  'ctm.filters'
])
.config(function ($routeProvider) {
  $routeProvider
  .when('/', {
    templateUrl: 'views/main.html',
    controller: 'MainCtrl'
  })
  .otherwise({
    redirectTo: '/'
  });
})
.config(function ($translateProvider) {
  $translateProvider.translations('en', {
    'geolocation.modal.locate_now': 'Locate Now',
    'criterion.code.A': 'Crescent easily visible',
    'criterion.code.B': 'Crescent visible under perfect conditions',
    'criterion.code.C': 'May need optical aid to find crescent',
    'criterion.code.D': 'Will need optical aid to find crescent',
    'criterion.code.E': 'Crescent not visible with telescope',
    'criterion.code.F': 'Crescent not visible, below the Danjon limit'
  });
  $translateProvider.translations('de', {
    TITLE: 'Hallo',
    FOO: 'Dies ist ein Paragraph.',
    BUTTON_LANG_EN: 'englisch',
    BUTTON_LANG_DE: 'deutsch'
  });
  $translateProvider.preferredLanguage('en');
});
