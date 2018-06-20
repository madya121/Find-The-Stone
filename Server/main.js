const npid = require('npid');

try {
    const pid = npid.create('service.pid', true);
    pid.removeOnExit();
} catch (err) {
    console.log(err);
    process.exit(1);
}

const place_types = [
  "accounting",
  "airport",
  "amusement_park",
  "aquarium",
  "art_gallery",
  "atm",
  "bakery",
  "bank",
  "bar",
  "beauty_salon",
  "bicycle_store",
  "book_store",
  "bowling_alley",
  "bus_station",
  "cafe",
  "campground",
  "car_dealer",
  "car_rental",
  "car_repair",
  "car_wash",
  "casino",
  "cemetery",
  "church",
  "city_hall",
  "clothing_store",
  "convenience_store",
  "courthouse",
  "dentist",
  "department_store",
  "doctor",
  "electrician",
  "electronics_store",
  "embassy",
  "fire_station",
  "florist",
  "funeral_home",
  "furniture_store",
  "gas_station",
  "gym",
  "hair_care",
  "hardware_store",
  "hindu_temple",
  "home_goods_store",
  "hospital",
  "insurance_agency",
  "jewelry_store",
  "laundry",
  "lawyer",
  "library",
  "liquor_store",
  "local_government_office",
  "locksmith",
  "lodging",
  "meal_delivery",
  "meal_takeaway",
  "mosque",
  "movie_rental",
  "movie_theater",
  "moving_company",
  "museum",
  "night_club",
  "painter",
  "park",
  "parking",
  "pet_store",
  "pharmacy",
  "physiotherapist",
  "plumber",
  "police",
  "post_office",
  "real_estate_agency",
  "restaurant",
  "roofing_contractor",
  "rv_park",
  "school",
  "shoe_store",
  "shopping_mall",
  "spa",
  "stadium",
  "storage",
  "store",
  "subway_station",
  "supermarket",
  "synagogue",
  "taxi_stand",
  "train_station",
  "transit_station",
  "travel_agency",
  "veterinary_care",
  "zoo"
];

const stones = [
  {
    n: "Mind Stone",
    i: "mind.png",
  },
  {
    n: "Power Stone",
    i: "power.png",
  },
  {
    n: "Reality Stone",
    i: "reality.png",
  },
  {
    n: "Soul Stone",
    i: "soul.png",
  },
  {
    n: "Space Stone",
    i: "space.png",
  },
  {
    n: "Time Stone",
    i: "time.png",
  },
];

const request = require('request');

let current_answer_location = null;

let init_nations = false;
let nation_names = [];
let is_querying = true;
let current_place = "";

// Get list of nations
const nations = [];
request('https://restcountries.eu/rest/v2/all', (err, resp, body) => {
  body = JSON.parse(body);
  nation_names = body.map(data => data.name);
  init_nations = true;
  query_place();
});

// Query Place
function query_place(socket) {
  const nation     = nation_names[Math.floor(Math.random() * nation_names.length)];
  const place_type = place_types[Math.floor(Math.random() * place_types.length)];

  console.log(nation, place_type);
  request('https://maps.googleapis.com/maps/api/place/textsearch/json?key=AIzaSyB0qlGcwnOYAb7YqgOoUmb02SXwpLYeJJ8&query=' + nation + '&type=' + place_type, (err, resp, body) => {
    body = JSON.parse(body);
    if (body.results.length === 0) {
      query_place();
      return;
    }

    const result = body.results[Math.floor(Math.random() * body.results.length)];
    current_place = result.name;
    const current_pos = result.geometry.location;

    request('https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyC6rye8Jqc7BX_1F7-BPNqMFn6hOz5VBPo&latlng=' + current_pos.lat + ',' + current_pos.lng + '&sensor=false', (err, resp, body) => {
        body = JSON.parse(body);
        let found = false;
        for (let i = 0; i < body.results.length && !found; i++) {
          let address = body.results[i];

          for (let j = 0; j < address.address_components.length && !found; j++) {
            let component = address.address_components[j];

            for (let k = 0; k < component.types.length && !found; k++) {
              let component_type = component.types[k];

              if (component_type === 'country') {
                found = true;

                current_place = current_place + ", " + component.long_name;

                const stone_index = Math.floor(Math.random() * stones.length);

                const location = {
                  p: current_pos,
                  c: component.long_name,
                  cs: component.short_name,
                  s: stones[stone_index]
                };
                current_answer_location = location;
                console.log(location);
                console.log(current_place);
                is_querying = false;
                blast_answer();
              }
            }
          }
        }
    });
  });
}

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = 3460;

const socket_list = [];
let connected_user = 0;

io.on('connection', (socket) => {
  // Someone is connected
  socket.on('request answer', (message) => {
    if (is_querying)
        socket.emit('answer', {});
    else socket.emit('answer', current_answer_location);
  });

  socket.on('found_it', (message) => {
    if (is_querying)
      return;

    blast_superstar_was_found();

    is_querying = true;
    query_place();
  });

  socket.on('disconnect', (message) => {
    for (let i = 0; i < socket_list.length; i++) {
      if (socket_list[i] === null)
        continue;

      if (socket_list[i].id === socket.id) {
        socket_list[i] = null;
        break;
      }
    }

    connected_user--;
    blast_connected_user();
  });

  let found = false;
  for (let i = 0; i < socket_list.length; i++) {
    if (socket_list[i] === null) {
      socket_list[i] = socket;
      found = true;
      break;
    }
  }
  if (!found) {
    socket_list.push(socket);
  }

  connected_user++;
  blast_connected_user();
  if (is_querying)
    socket.emit('answer', {});
  else socket.emit('answer', current_answer_location);
});

function blast_connected_user() {
  for (let i = 0; i < socket_list.length; i++) {
    if (socket_list[i] !== null) {
      socket_list[i].emit('connected_user', connected_user);
    }
  }
}

function blast_answer() {
  for (let i = 0; i < socket_list.length; i++) {
    if (socket_list[i] !== null) {
      socket_list[i].emit('answer', current_answer_location);
    }
  }
}

function blast_superstar_was_found() {
  for (let i = 0; i < socket_list.length; i++) {
    if (socket_list[i] !== null) {
      socket_list[i].emit('found_it', {
        p: current_place,
        l: current_answer_location
      });
    }
  }
}

http.listen(port, () => {
  console.log('listening on *:' + port);
});
