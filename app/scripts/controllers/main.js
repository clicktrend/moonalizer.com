'use strict';

angular.module('app')
.controller('MainCtrl', function ($timeout, $scope) {

  var zoom = 1;

  /**
   * Masjid Haram
   */
  $scope.lat = 21.4121622297254;
  $scope.lon = 39.84466552734375;

  /**
   * Fine tuning
   * TODO: shoul be configurable from UI
   */
  $scope.threshold = 3;

  var getCalculator = function () {
    return new CalculatorFactory.create('yallop');
  };

  $scope.map = {
    center: {
      latitude: $scope.lat,
      longitude: $scope.lon
    },
    zoom: zoom,
    options: {scrollwheel: false},
    events: {
      click: function (mapModel, eventName, originalEventArgs) {
        $scope.$apply(function () {
          var e = originalEventArgs[0];

          calculate($scope.dates[$scope.date], e.latLng.lat(), e.latLng.lng());

        });

      }
    },
    tilesloaded: function (map) {
      $scope.$apply(function () {
        $scope.mapInstance = map;
      });
    }
  };

  var calculate = function (date, lat, lon) {
    updateMarker({
      latitude: lat,
      longitude: lon
    });

    var calc = getCalculator();
    var c = calc.calculate(date, lat, lon);

    $scope.results = c;

    drawSunMoonSet(calc.getAlgorithm(), c.date, lat, lon);
    drawHorizon(calc.getAlgorithm(), c.date, lat, lon);
  };

  $scope.calculate = calculate;

  var updateMarker = function (coordinates) {
    $scope.marker = {
      coords: coordinates
    };
  };

  $scope.updateMarker = updateMarker;

  updateMarker({
    latitude: $scope.lat,
    longitude: $scope.lon
  });

  /**
   * Moon Phase
   */

  var drawPhase = function (phase) {
    var sweep = [];
    var mag;
    if (phase <= 0.25) {
      sweep = [1, 0];
      mag = 20 - 20 * phase * 4;
    } else
    if (phase <= 0.50) {
      sweep = [0, 0];
      mag = 20 * (phase - 0.25) * 4;
    } else
    if (phase <= 0.75) {
      sweep = [1, 1];
      mag = 20 - 20 * (phase - 0.50) * 4;
    } else
    if (phase <= 1) {
      sweep = [0, 1];
      mag = 20 * (phase - 0.75) * 4;
    } else {
      exit;
    }
    var d = "m100,0 ";
    d = d + "a" + mag + ",20 0 1," + sweep[0] + " 0,150 ";
    d = d + "a20,20 0 1," + sweep[1] + " 0,-150";

    var svg = document.getElementById("moonbox");

    while (svg.lastChild) {
      svg.removeChild(svg.lastChild);
    }

    var path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    path.setAttribute('class', 'moon');
    path.setAttribute('d', d);
    svg.appendChild(path);
  };

  $scope.updateDate = function (month, year) {
    year = month === -1 ? year - 1 : year;
    month = month === -1 ? 12 : month;

    var hijri = HijriJS.hijriToGregorian(year, month - 1, 29).toString();

    $scope.dates = [
      moment(hijri).subtract(1, 'days'),
      moment(hijri),
      moment(hijri).add(1, 'days')
    ];

    $scope.updateDays(0);
  };

  $scope.updateDays = function (dayIndex) {
    var calc = getCalculator();
    drawPhase(calc.getAlgorithm().getMoonPhase($scope.dates[dayIndex]));
  };

  // Actual hijric date
  var today = HijriJS.today().toFormat("d-m-yyyy").split('-');
  $scope.month = parseInt(today[1]);
  $scope.year = parseInt(today[2]);
  $scope.updateDate($scope.month, $scope.year);

  /*
   * PLOTTING
   */

  $scope.progress = 0;
  $scope.rectangles = [];

  var prepareCoords = function () {
    var coords = [];

    for (var i = 120; i >= 0; i = i - $scope.threshold) {
      for (var l = 360 - $scope.threshold - 1; l >= 0; l = l - $scope.threshold) {
        var lat = i - 60;
        var lon = l - 180;
        coords.push({lat: lat, lon: lon});
      }
    }

    return coords;
  };

  $scope.plot = function (date) {
    $scope.rectangles = [];
    $scope.progress = 0;

    var calculator = getCalculator();

    var calc = new Plotter(calculator, date, prepareCoords(), {
      jobRunning: function (self) {
        $scope.progress = parseInt((self.counter / self.operations) * 100);
        $scope.$apply();
      },
      jobDone: function (self) {
        $scope.progress = 100;
        $scope.progressStatus = self.asyncStopTimer;
        $scope.$apply();
      },
      jobLatitudeDone: function (self) {
        createRectangles(self.codes);
        self.resetCodes();
      }
    });
    $timeout(function () {
      calc.calculateAsync();
    }, 0);
  };

  var colors = {
    A: '#00A65A',
    B: '#F39C12',
    C: '#85144B',
    D: '#00C0EF',
    E: '#932AB6',
    F: '#FFFFFF'
  };

  var createRectangles = function (codes) {
    var i = $scope.rectangles.length;
    for (var code in codes) {

      var coords = codes[code];
      var mapArray = {};
      var sortArray = [];

      for (var lat in coords) {
        var lon = coords[lat];

        sortArray.push(parseInt(lat));
        mapArray[lat] = {latitude: lat, longitude: lon};
      }

      sortArray.sort(function (a, b) {
        return a > b ? 1 : -1;
      });

      for (var l = 0; l < sortArray.length; l++) {
        var lat = sortArray[l];
        var lons = mapArray[lat];

        var bounds = {
          ne: {latitude: lat + $scope.threshold, longitude: lons['longitude'][0] + ($scope.threshold - 1)},
          sw: {latitude: lat, longitude: lons['longitude'][lons['longitude'].length - 1] - 1}
        };

        var rectangle = {
          id: i,
          clickable: false,
          draggable: false,
          editable: false,
          visible: true,
          geodesic: false,
          stroke: {weight: 0, color: colors[code], opacity: 0.2},
          fill: {weight: 3, color: colors[code], opacity: 0.2},
          bounds: bounds
        };

        $scope.rectangles.push(rectangle);
        i++;
      }
    }
  };

  /**
   * Sun/moon set graph
   */

  $scope.setOptions = {
    chart: {
      type: 'lineChart',
      height: 300,
      margin: {
        top: 20,
        right: 20,
        bottom: 40,
        left: 55
      },
      color: [
        '#F9D64A',
        '#AAA5A5',
        '#000000'
      ],
      x: function (d) {
        return d.x;
      },
      y: function (d) {
        return d.y;
      },
      useInteractiveGuideline: true,
      yAxis: {
        axisLabel: 'Altitude',
        tickFormat: function (d) {
          return ('' + d).substr(0, 5);
        },
      },
      xAxis: {
        axisLabel: 'Time',
        tickFormat: function (d) {
          return moment.unix(d).format('LT');
        },
        axisLabelDistance: 30
      },
      callback: function (chart) {
        //console.log("!!! lineChart callback !!!");
      }
    }
  };

  var drawSunMoonSet = function (algo, date, lat, lon) {

    var data = {sun: [], moon: [], horizon: []};
    date = moment(date).subtract(5, 'hours');
    for (var i = 0; i < 60; i++) {
      date.add(10, 'minutes');
      var moonPos = algo.getMoonPosition(date.toDate(), lat, lon);
      var sunPos = algo.getSunPosition(date.toDate(), lat, lon);
      data.moon.push({x: date.unix(), y: moonPos.altitude});
      data.sun.push({x: date.unix(), y: sunPos.altitude});
      data.horizon.push({x: date.unix(), y: 0});
    }

    $scope.setData = [
      {
        key: "Sunset",
        values: data.sun
      }, {
        key: "Moonset",
        values: data.moon
      }, {
        key: "Horizon",
        values: data.horizon
      }];
  };

  /**
   * HORIZON
   */

  $scope.horizonOptions = {
    chart: {
      type: 'scatterChart',
      height: 300,
      color: [
        '#F9D64A',
        '#AAA5A5',
        '#000000'
      ],
      scatter: {
        onlyCircles: false
      },
      showDistX: true,
      showDistY: true,
      tooltipContent: function (key) {
        return '<h3>' + key + '</h3>';
      },
      transitionDuration: 350,
      xAxis: {
        axisLabel: 'Azimuth',
        tickFormat: function (d) {
          return d3.format('.02f')(d);
        },
        axisLabelDistance: 5
      },
      yAxis: {
        axisLabel: 'Altitude',
        tickFormat: function (d) {
          return d3.format('.02f')(d);
        },
        axisLabelDistance: 5
      }
    }
  };

  var drawHorizon = function (algo, date, lat, lon) {

    var moonPos = algo.getMoonPosition(date, lat, lon);
    var sunPos = algo.getSunPosition(date, lat, lon);

    var observerPos = parseInt((sunPos.azimuth + moonPos.azimuth) / 2);

    $scope.horizonData = [
      {
        key: "Sun",
        values: [{
	x: sunPos.azimuth, y: sunPos.altitude, size: 100, shape: 'circle', color: '#F9D64A'
          }]
      }, {
        key: "Moon",
        values: [{
	x: moonPos.azimuth, y: moonPos.altitude, size: 50, shape: 'circle', color: '#AAA5A5'
          }]
      }, {
        key: "5° marks",
        values: [
          // right
          {x: observerPos + 5, y: 0, size: 5, shape: 'cross'},
          {x: observerPos + 10, y: 0, size: 5, shape: 'cross'},
          {x: observerPos + 15, y: 0, size: 5, shape: 'cross'},
          // left
          {x: observerPos - 5, y: 0, size: 5, shape: 'cross'},
          {x: observerPos - 10, y: 0, size: 5, shape: 'cross'},
          {x: observerPos - 15, y: 0, size: 5, shape: 'cross'},
          // below
          {x: observerPos, y: -5, size: 5, shape: 'cross'},
          {x: observerPos, y: -10, size: 5, shape: 'cross'},
          {x: observerPos, y: -15, size: 5, shape: 'cross'},
          // above
          {x: observerPos, y: 5, size: 5, shape: 'cross'},
          {x: observerPos, y: 10, size: 5, shape: 'cross'},
          {x: observerPos, y: 15, size: 5, shape: 'cross'}
        ],
        color: '#000000'
      }
    ];
  };

  /*
   console.log($scope.date);
   console.log($scope.dates[$scope.date]);
   var calc = getCalculator($scope.dates[$scope.date]);
   drawPhase(calc.getAlgorithm().getMoonPhase());
   */
});
