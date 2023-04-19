var map, searchManager, queryManager, infobox
var sdsDataSourceUrl = 'http://spatial.virtualearth.net/REST/v1/data/Microsoft/PointsOfInterest'

function loadMapScenario() {
    map = new Microsoft.Maps.Map(document.getElementById('myMap'), {});
    Microsoft.Maps.loadModule('Microsoft.Maps.Search', function () {
        searchManager = new Microsoft.Maps.Search.SearchManager(map)}
    )
    Microsoft.Maps.loadModule('Microsoft.Maps.SpatialDataService', function () {
        queryManager = Microsoft.Maps.SpatialDataService.QueryAPIManager
    })
    infobox = new Microsoft.Maps.Infobox(map.getCenter(), {
        visible: false
    });
    infobox.setMap(map)
}

function handleSubmit(e) {
    // prevent redirect
    e.preventDefault()
    const data = new FormData(form)
    const address = data.get('address')

    // remove pinpoints
    map.entities.clear()

    searchManager.geocode({
        bounds: map.getBounds(),
        where: address,
        callback: searchParks,
        errorCallback: errorCannotFindAddress,
    })
}

function errorCannotFindAddress(e) {
    alert("Address not found.");
}

function searchParks (address) {
    queryManager.search({
        queryUrl: sdsDataSourceUrl,
        spatialFilter: {
            spatialFilterType: 'nearby',
            location: address.results[0].location,
            radius: 25
        },
        // Filter to retrieve Parks/Recreaction.
        filter: new Microsoft.Maps.SpatialDataService.Filter('EntityTypeID','eq',7947) 
    }, map, searchWeather)
}

async function searchWeather(data) {

    // get weather data from backend
    const longlat = data.map(({metadata:{Latitude,Longitude}}) => { 
        return {Latitude, Longitude}
    })
    const results = await (
        await fetch('/weather', 
            {
                method: 'POST', 
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({data: longlat})
            })
        ).json()
    
    setPins(data, JSON.parse(results.data))

    // Add results to the map.
    map.entities.push(data);
}

function setPins(locations, weather) {

    for (let i = 0; i < locations.length; i++) {
        // adding weather to location metadata
        locations[i].metadata = {... locations[i].metadata, ... weather[i]}
        // Add a click event handler to the pushpin.
        Microsoft.Maps.Events.addHandler(locations[i], 'click', pushpinClicked);

        // Add pushpin to the map.
        map.entities.push(locations[i]);
    }

    // reset map view
    let locs = locations.map(loc => loc.getLocation())
    let rect = Microsoft.Maps.LocationRect.fromLocations(locs);
    map.setView({ bounds: rect, padding: 20 });
}

function pushpinClicked(e) {
    if (e.target.metadata) {
        // Set the infobox options with the metadata of the pushpin.
        infobox.setOptions({
            location: e.target.getLocation(),
            title: e.target.metadata.Name,
            description: `Weather: ${e.target.metadata.weather} | Wind (kph): ${e.target.metadata.wind_kph} | Gust (kph): ${e.target.metadata.gust_kph}`,
            visible: true
        });
    }
}



const form = document.getElementById("form")
form.addEventListener("submit", handleSubmit)