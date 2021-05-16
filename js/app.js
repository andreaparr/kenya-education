(function() {

  // mapbox access token for aparr account
  L.mapbox.accessToken = 'pk.eyJ1IjoiYW5kcmVhcnBhcnIiLCJhIjoiY2o2NGJrODB0MG0weTJxbnp1M2h2cWppdyJ9.O4620rmp32gJntwavWnlaQ';

  // create the Leaflet map using mapbox.light tiles
  var map = L.mapbox.map('map', 'mapbox.dark-v10', {
    zoomSnap: .1,
    center: [-.23, 37.8],
    zoom: 7,
    minZoom: 6,
    maxZoom: 9,
    maxBounds: L.latLngBounds([-6.22, 27.72], [5.76, 47.83])
  });

  // load CSV data
  omnivore.csv('data/kenya_education_2014.csv')
    .on('ready', function(e) {
      // convert Leaflet GeoJson to regular GeoJSON data
      drawMap(e.target.toGeoJSON());
      drawLegend(e.target.toGeoJSON());
    })
    // log a message if there's an error with the data
    .on('error', function(e) {
      console.log(e.error[0].message);
    });

  // create default options for creating circleMarkers from GeoJSON point data
  var options = {
    pointToLayer: function(feature, ll) {
      return L.circleMarker(ll, {
        opacity: 1,
        weight: 2,
        fillOpacity: 0,
      })
    }
  }

  function drawMap(data) {
    // create distinct layers for girls data and boys data
    var girlsLayer = L.geoJson(data, options).addTo(map);
    var boysLayer = L.geoJson(data, options).addTo(map);

    // fit the map boundaries to one of the layers
    map.fitBounds(girlsLayer.getBounds());

    // style girls layer orange
    girlsLayer.setStyle({
      color: '#D96D02',
    });
    // style boys layer purple
    boysLayer.setStyle({
      color: '#6E77B0',
    });

    resizeCircles(girlsLayer, boysLayer, 1);
    sequenceUI(girlsLayer, boysLayer);
    // initiate grade box with a value of 1
    getGrade(1);
  } // end drawMap

  // accept a number and calculate the radius of a circle given this number and return it to the caller
  function calcRadius(val) {
    var radius = Math.sqrt(val / Math.PI);
    return radius * .5; // adjust .5 as a scale factor
  } // end calcRadius

  function resizeCircles(girlsLayer, boysLayer, currentGrade) {

    // for each layer, determine and calculate the radius of the circle based on the number of girls 'G' and boys 'B' in that grade
    girlsLayer.eachLayer(function(layer) {
      var radius = calcRadius(Number(layer.feature.properties['G' + currentGrade]));
      layer.setRadius(radius);
    });
    boysLayer.eachLayer(function(layer) {
      var radius = calcRadius(Number(layer.feature.properties['B' + currentGrade]));
      layer.setRadius(radius);
    });
    retrieveInfo(boysLayer, currentGrade);
  } // end resizeCircles

  function sequenceUI(girlsLayer, boysLayer) {
    // select the slider
    $('.slider')
      // when the user moves the slider
      .on('input change', function() {
        // determine the current grade by the value the user has selected in the slider
        var currentGrade = $(this).val();
        // resize the circles based on that value
        resizeCircles(girlsLayer, boysLayer, currentGrade);
        // and populate the grade box with that value
        getGrade(currentGrade);
      });
    // create Leaflet control for the slider
    var sliderControl = L.control({
      position: 'bottomleft'
    });

    // when added to the map
    sliderControl.onAdd = function(map) {

      // select the element with id of 'slider'
      var controls = L.DomUtil.get("slider");

      // disable the mouse events
      L.DomEvent.disableScrollPropagation(controls);
      L.DomEvent.disableClickPropagation(controls);

      // add slider to the control
      return controls;

    }

    // add the control to the map
    sliderControl.addTo(map);
  } // end sequenceUI

  function drawLegend(data) {
    // create Leaflet control for the legend
    var legend = L.control({
      position: 'bottomright'
    });
    // when added to the map
    legend.onAdd = function(map) {

      // select the element with id of 'legend'
      var div = L.DomUtil.get("legend");

      // disable the mouse events
      L.DomEvent.disableScrollPropagation(div);
      L.DomEvent.disableClickPropagation(div);

      // add legend to the control
      return div;

    }
    // add the control to the map
    legend.addTo(map);

    // declare a variable that will be an array
    var dataValues = [];
    // iterate through each feature of the GeoJSON data
    data.features.map(function(school) {
      // iterate through the properties
      for (var grade in school.properties) {

        var attribute = school.properties[grade];
        // if the property is a number
        if (Number(attribute)) {
          // push the numeric value into an array
          dataValues.push(attribute);
        }

      }
    });

    // sort our array
    var sortedValues = dataValues.sort(function(a, b) {
      return b - a;
    });

    // round the highest number and use as our large circle diameter
    var maxValue = Math.round(sortedValues[0] / 1000) * 1000;

    // calc the diameters
    var largeDiameter = calcRadius(maxValue) * 2,
      smallDiameter = largeDiameter / 2;

    // select our circles container and set the height
    $(".legend-circles").css('height', largeDiameter.toFixed());

    // set width and height for large circle
    $('.legend-large').css({
      'width': largeDiameter.toFixed(),
      'height': largeDiameter.toFixed()
    });
    // set width and height for small circle and position
    $('.legend-small').css({
      'width': smallDiameter.toFixed(),
      'height': smallDiameter.toFixed(),
      'top': largeDiameter - smallDiameter,
      'left': smallDiameter / 2
    })

    // label the max and median value
    $(".legend-large-label").html(maxValue.toLocaleString());
    $(".legend-small-label").html((maxValue / 2).toLocaleString());

    // adjust the position of the large based on size of circle
    $(".legend-large-label").css({
      'top': -11,
      'left': largeDiameter + 30,
    });

    // adjust the position of the large based on size of circle
    $(".legend-small-label").css({
      'top': smallDiameter - 11,
      'left': largeDiameter + 30
    });

    // insert a couple hr elements and use to connect value label to top of each circle
    $("<hr class='large'>").insertBefore(".legend-large-label")
    $("<hr class='small'>").insertBefore(".legend-small-label").css('top', largeDiameter - smallDiameter - 8);

  } // end drawLegend

  function retrieveInfo(boysLayer, currentGrade) {
    // info variable selects 'info' box
    var info = $('#info');
    // when you mouseover the layer
    boysLayer.on('mouseover', function(e) {
      // remove the none class to display the element
      info.removeClass('none').show();
      // define props as arrays of values for girls/boys
      var props = e.layer.feature.properties;
      var girlsValues = [],
        boysValues = [];
      // iterate through totals for each grade for girls/boys
      for (var i = 1; i <= 8; i++) {
        girlsValues.push(props['G' + i]);
        boysValues.push(props['B' + i]);
      };

      // populate the info window with the name of the county the user is hovering over
      $('#info span').html(props.COUNTY);
      // the current grade level selected by the slider widget
      $(".girls span:first-child").html('(grade ' + currentGrade + ')');
      $(".boys span:first-child").html('(grade ' + currentGrade + ')');
      // the raw total for the girls/boys for that county and grade
      $(".girls span:last-child").html(props['G' + currentGrade]);
      $(".boys span:last-child").html(props['B' + currentGrade]);

      // create spark line charts with colors for girls/boys that show overall trends
      $('.girlspark').sparkline(girlsValues, {
        width: '160px',
        height: '30px',
        lineColor: '#D96D02',
        fillColor: '#d98939 ',
        spotRadius: 0,
        lineWidth: 2
      });

      $('.boyspark').sparkline(boysValues, {
        width: '160px',
        height: '30px',
        lineColor: '#6E77B0',
        fillColor: '#878db0',
        spotRadius: 0,
        lineWidth: 2
      });

      // raise opacity level as visual affordance
      e.layer.setStyle({
        fillOpacity: .6
      });

    });
    // hide the info panel when mousing off layergroup and remove affordance opacity
    boysLayer.on('mouseout', function(e) {
      info.hide();
      e.layer.setStyle({
        fillOpacity: 0
      });
    });

    // when the mouse moves on the document
    $(document).mousemove(function(e) {
      // first offset from the mouse position of the info window
      info.css({
        "left": e.pageX + 6,
        "top": e.pageY - info.height() - 25
      });

      // if it crashes into the top, flip it lower right
      if (info.offset().top < 4) {
        info.css({
          "top": e.pageY + 15
        });
      }
      // if it crashes into the right, flip it to the left
      if (info.offset().left + info.width() >= $(document).width() - 40) {
        info.css({
          "left": e.pageX - info.width() - 80
        });
      }
    });
  } // end retrieveInfo

  function getGrade(currentGrade) {
    //create Leaflet control for the grade
    var gradeBox = L.control({
      position: 'bottomleft'
    });

    // when added to the map
    gradeBox.onAdd = function(map) {

      // select the element with id of 'grade'
      var div = L.DomUtil.get("grade");
      // add the grade level
      div.innerHTML = "<h3><b>" + "Grade: " + "</b>"+ currentGrade + "</h3>"
      return div;

    }

    // add the control to the map
    gradeBox.addTo(map);

  }

})();
