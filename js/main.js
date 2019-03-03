// GOAL: Proportional symbols representing attribute values of mapped features

var currentMap = 0 // Global variable to hold the leaflet map object

// Function to instantiate the Leaflet map
function createMap(){
    
    // Create the map
    var map = L.map('map', {
        center: [40, -95],
        zoom: 4,
        //set to false to overide default position
        zoomControl: false
    })

    // add zoomControl
    L.control.zoom({ position: 'topright' }).addTo(map);
    

 
    // Add OSM base tilelayer
    L.tileLayer('https://api.mapbox.com/styles/v1/cmflood/cjspfphw50yap1fqvw3b0u0in/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY21mbG9vZCIsImEiOiJjamt5OW01bzkwaDNkM3ZwNDdlMjkzbnhxIn0.YM5MN8JltD_tvyZY0qMnRQ', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> | Visitor data: <a href="https://irma.nps.gov/Stats/">National Park Service</a> | Contributors: <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a> | Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'cmflood',
    }).addTo(map)
    
    // Set global map variable to map object
    currentMap = map

    //call getData function
    getData(map)
}




// Initialize global variables for use later
var currentLayer = 0 // holds geoJsonLayer for future modifications
var currentAttributes = 0 // Visitor attribute names
var currentAttributes2 = 0 // Emptn attribute names
var currentFilter = 'all' // current Filter selection, initially 'all'
var rawJson = 0 // holds ajax response, aka raw json data
var featureSelected = 0 // holds the currently selected park information
var currentAttribute = 0 // holds the currently selected visitor attribute name
var currentAttribute2 = 0 // empty attribute name

function numberWithCommas(x) {
   return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Function to retrieve the data via ajax and place it on the map
function getData(map){
    // Load the data
    $.ajax("data/NtlPkVis2.geojson", {
        dataType: "json",
        success: function(response){
            // Set global rawJson to ajax response
            rawJson = response
            // Process rawJson/response into lists of data sets- Percentage and Population
            var processedAttributes = processData(response)
            currentAttributes = processedAttributes[0]
            console.log(currentAttributes[0])
            currentAttributes2 = processedAttributes[1]
            // Call function to create proportional symbols, put in a layer
            geoJsonLayer = createPropSymbols(response, map, 0, currentFilter)
            currentLayer = geoJsonLayer
            // Call function to create sequence controls for user
            createSequenceControls(map, currentAttributes)
                    
            //add geo JSON layer to map
            map.addLayer(geoJsonLayer)
            
            // call function to create proportional symbol legend, must be called AFTER the above addLayer is called so that a layer already exists!
            createLegend(map, currentAttributes)
            console.log(currentAttributes)
            updateLegend(map, currentAttributes[0])
        }
    })
}

// Build attributes arrays from the data
function processData(data){
    // Empty arrays to hold attributes
    var attributes = []
    var attributes2 = []
    // Properties of the first feature in the dataset
    var properties = data.features[0].properties
    // Push each attribute name into attributes array
    for (var attribute in properties){
        //catalog attributes with percentage values
        if (attribute.indexOf("Visitors") > -1){
            attributes.push(attribute)
        }
        //catalog attributes with population values
        if (attribute.indexOf("Visitors") > -1){
            attributes2.push(attribute)
        }
    }
    return [attributes, attributes2];
};
    
function createPropSymbols(data, map, idx, filterStr) {
    
    // Get and store current attributes based on index (idx)
    var attribute = currentAttributes[idx];
    currentAttribute = attribute;
    //var attribute2 = currentAttributes2[idx]; remove?
    //currentAttribute2 = attribute2; remove?
    
    // Create marker options
    var geojsonMarkerOptions = {
        radius: 8,
        fillColor: "#124238",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.6
    };
    
    var geoJsonOptions = {
        pointToLayer: function (feature, latlng){
            
            // For each feature, determine its value for the selected attribute
            var attValue = Number(feature.properties[attribute])
            
            // Test for variable type, then give each feature's circle marker a radius based on its attribute value 
            
            var strTest = attribute.search("Visitors")
            if (strTest > -1) {
                geojsonMarkerOptions.radius = calcPropRadius(attValue, 0.0008)
                details = ["Population", ""]
                details2 = ["Percentage", "%"] //remove?
            } 
            
            // Create circle marker layer
            var layer = L.circleMarker(latlng, geojsonMarkerOptions)
            
            // Build popup content string
            var popupContent = "<p><b>Park:</b> " + feature.properties.ParkName + "</p>"
            
            // Bind the popup to the circle marker
            layer.bindPopup(popupContent, {
                offset: new L.Point(0, -geojsonMarkerOptions.radius),
                closeButton: false,
            })
            
            // Event listeners to open popup on hover, update the info panel on click and
            // Add clicked feature to global variable for future use
            layer.on({
                mouseover: function(){
                    this.openPopup()
                },
                mouseout: function(){
                    this.closePopup()
                },
                click: function(){
                    featureSelected = feature
                    updatePanel(currentAttribute, details)
                    this.closePopup();
                }
            })

            return layer
        },
        filter: function(feature, layer) { // Add filter function for new geoJsonLayer
            // If the data-filter attribute is set to "all", return all (true)
            // Otherwise, filter markers based on visitor size
            var returnBool = false
            if (filterStr === 'all'){
                returnBool = true
            } else if (filterStr === 'big'){
                if (feature.properties[currentAttribute] > 4000000) {
                    returnBool = true
                }
            } else if (filterStr === 'medium'){
                if ((feature.properties[currentAttribute] <= 4000000) && (feature.properties[currentAttribute] > 2000000)) {
                    returnBool = true
                }
            } else if (filterStr === 'small'){
                if ((feature.properties[currentAttribute] <= 2000000)) {
                    returnBool = true
                }
            } 
            return returnBool
        }
    }
    // Create a Leaflet GeoJSON layer, based on rawJson data and previously defined geoJsonOptions
    var geoJsonLayer = L.geoJson(data, geoJsonOptions)
    return geoJsonLayer    
};

// Calculate the radius of each proportional symbol
function calcPropRadius(attValue, scaleFactor) {
    // Area based on attribute value and scale factor
    var area = attValue * scaleFactor
    // Radius calculated based on area
    var radius = Math.sqrt(area/Math.PI)
    return radius
}

// Create new sequence controls
function createSequenceControls(map, attributes){
    
    // Add skip button for "reverse" functionality, replace button content with image
    $('#slider').append('<button class="skip" id="reverse">Reverse</button>')  
    $('#reverse').html('<img src="img/arrowback5.svg" alt= "Arrow back" title = "Back">')
    
    // Create range input element (slider)
    $('#slider').append('<input class="range-slider" type="range">')
    
    // Add skip button for "forward" functionality, replace button content with image
    $('#slider').append('<button class="skip" id="forward">Skip</button>')    
    $('#forward').html('<img src="img/arrowforward5.svg" alt = "Arrow forward" title = "Forward">')
    
    // Set slider attributes
    $('.range-slider').attr({
        max: 7,
        min: 0,
        value: 0,
        step: 1
    })
    
    // Click listener for buttons
    $('.skip').click(function(){
        // Get the old index value
        var index = $('.range-slider').val()

        // Increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++
            // If past the last attribute, wrap around to first attribute
            index = index > 7 ? 0 : index
        } else if ($(this).attr('id') == 'reverse'){
            index--
            // If past the first attribute, wrap around to last attribute
            index = index < 0 ? 7 : index
        }

        // Update slider after arrow click
        $('.range-slider').val(index)
        
        // Rebuild layer as population values may have changed during time sequence
        currentMap.removeLayer(geoJsonLayer)
        geoJsonLayer = createPropSymbols(rawJson, currentMap, index, currentFilter)
        currentLayer = geoJsonLayer
        currentMap.addLayer(geoJsonLayer)
        
        // Reset current attributes and update the info panel
        currentAttribute = currentAttributes[index]
        console.log("here's the sequence click currentAttribute[index] " + currentAttribute)
        updatePanel()
        
        // Update legend title with new year
        $('#legendTitle').text("Visitors in " + currentAttribute.split("_")[1])
        updateLegend(map, currentAttribute)
    })

    // Input listener for slider
    $('.range-slider').on('input', function(){
        // Get the new index value
        var index = $(this).val()
        
        // Rebuild layer as population values may have changed during time sequence
        currentMap.removeLayer(geoJsonLayer)
        geoJsonLayer = createPropSymbols(rawJson, currentMap, index, currentFilter)
        currentLayer = geoJsonLayer
        currentMap.addLayer(geoJsonLayer)
        
        // Reset current attributes and update the info panel
        currentAttribute = attributes[index]
        updatePanel()
        
        // Update legend title with new year
        $('#legendTitle').text("Visitors in " + currentAttribute.split("_")[1])
        updateLegend(map, currentAttribute)
    })
}

// Function to update the information panel
function updatePanel() {
    if (featureSelected != 0) {
        
        // Determine the nature of the main variable
        var strTest = currentAttribute.search("Visitors")
        
        if (strTest > -1) {
            details = ["Visitors", ""]
            details2 = ["Percentage", "%"] //remove?
        } 

        // Utilize current feature, currentAttributes to create popup content
        var panelContent = "<p><b>Park:</b> " + featureSelected.properties.ParkName + "</p>"
        var year = currentAttribute.split("_")[1]
        var visitsWithCommas = numberWithCommas(featureSelected.properties[currentAttribute]);
        panelContent += "<p><b>" + details[0] + " in " + year + ":</b> " + visitsWithCommas + "</p>"

        // Update panel with new popup content
        $("#panel").html(panelContent)
    }
}

// Click listener for the filter menu
$('.menu-ui a').on('click', function() {
    // For each filter link, get the 'data-filter' attribute value.
    var filter = $(this).data('filter')
    
    // Set global variable for future use
    currentFilter = filter
    
    // Change which filter menu option is active, get slider index
    $(this).addClass('active').siblings().removeClass('active')
    var currentIdx = $('.range-slider').val()
    
    // Remove current map layer, create new one with appropriate filter
    currentMap.removeLayer(geoJsonLayer)
    geoJsonLayer = createPropSymbols(rawJson, currentMap, currentIdx, filter)
    currentLayer = geoJsonLayer
    
    // Add new layer to map, wipe away the info panel
    currentMap.addLayer(geoJsonLayer)
    updateLegend(currentMap, currentAttribute);
    $("#panel").html("<p>This is a map of the most popular, well-visited National Parks in the United States. Want to know more? Click on one of the parks!</p>")
})

function createLegend(map, attributes){
    //console.log("hellohello " + attributes);
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //add temporal legend div to container
            $(container).append('<div id="temporal-legend">')

            //start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="180px" height="160px">';

            //array of circle names to base loop on, adjusting these numbers affects text spacing
            var circles = {
            max: 40,
            mean: 70,
            min: 100
            };

            //loop to add each circle and text to svg string
            for (var circle in circles){
                //circle string
                svg += '<circle class="legend-circle" id="' + circle + '" fill="#124238" fill-opacity="0.6" stroke="#000000" cx="55"/>';

                //text string
                svg += '<text id="' + circle + '-text" x="123" y="' + circles[circle] + '"></text>';
            };

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            $(container).append(svg);
            

            return container;
        }
    });

    map.addControl(new LegendControl());
};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;
    
    map.eachLayer(function(layer){ //changing this to currentLayer doesn't help
        

        //get the attribute value
        if (layer.feature){ //changing this to currentLayer doesn't help
            console.log("layer" + layer.feature.properties[attribute]); //changing this to currentLayer doesn't help
            var attributeValue = Number(layer.feature.properties[attribute]); //changing this to currentLayer doesn't help

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

//Example 3.7 line 1...Update the legend with new attribute
function updateLegend(map, attribute){
    console.log("wellhello" + attribute);
//    //create content for legend
    var year = attribute.split("_")[1];
    var content = "Visitors in " + year;

    //replace legend content
    $('#temporal-legend').html(content);

    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attribute);
    
    
    for (var key in circleValues){
        console.log("here" + circleValues[key]);
        //get the radius
        var radius = calcPropRadius(circleValues[key], 0.0008);
        console.log("radius" + radius);

        //Step 3: assign the cy and r attributes
        $('#'+key).attr({
            cy: 112 - radius,
            r: radius
        });
        $('#'+key+'-text').text(numberWithCommas(Math.round(circleValues[key]*100)/100));
    };
    
};

$(document).ready(createMap)



