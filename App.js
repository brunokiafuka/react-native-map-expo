import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, Image } from 'react-native';
import { MapView, Permissions } from 'expo' // step 1 - import Map view
import Polyline from '@mapbox/polyline' // step 9 - import polyline to drawline on the map
const locations = require('./locations.json') // step 7 - import json for markers
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const API_KEY = 'YOUR API KEY'
const baseURL = 'https://maps.googleapis.com/maps/api/directions/json'

const EDGE_PADDING = {
  top: 100,
  right: 100,
  bottom: 200,
  left: 100
}

export default class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = { //Step 2 - set state for lat and long
      latitude: null,
      longitude: null,
      destLatitude: null,
      destLongitude: null,
      coords: [],
      duration: '',
      distance: '',
      from: '',
      to: '',
      showPlacesList: false, //dismiss listview
      locations: locations // step 8 - add locations
    }
  }

  async componentDidMount() { //step 3 - get permissions 
    const { status } = await Permissions.getAsync(Permissions.LOCATION)
    if (status !== 'granted') {
      const res = await Permissions.askAsync(Permissions.LOCATION)
    }

    navigator.geolocation.getCurrentPosition( // step 4 - get current location  
      ({ coords: { latitude, longitude } }) => this.setState({ latitude, longitude }),
      (error) => console.log('error', error),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    )
  }


  //setp 11
  geDirections = async (startLoc, desPlaceID) => {
    try {
      const res = await fetch(`${baseURL}?origin=${startLoc}&destination=place_id:${desPlaceID}&mode=transit&key=${API_KEY}`)
      const resJson = await res.json()
      this.setState({
        destLatitude: resJson.routes[0].legs[0].end_location.lat,
        destLongitude: resJson.routes[0].legs[0].end_location.lng,
        duration: resJson.routes[0].legs[0].duration.text,
        distance: resJson.routes[0].legs[0].distance.text,
        from: resJson.routes[0].legs[0].start_address,
        to: resJson.routes[0].legs[0].end_address
      })  /// set end point marker
      console.log(resJson.routes[0].legs[0].duration.text)
      const points = Polyline.decode(resJson.routes[0].overview_polyline.points)
      const coords = points.map(point => {
        return {
          latitude: point[0],
          longitude: point[1]
        }
      })
      this.setState({ coords })
      const options = {
        edgePadding: EDGE_PADDING,
      }
      this.map.fitToCoordinates(coords, options) //fit all points
    } catch (error) {
      console.log('error:', error)
    }
  }

  renderModalContent = () => (
    <View style={styles.modalContent}>
      <Text>Hello!</Text>
    </View>
  );

  render() {
    const { latitude, longitude } = this.state
    if (latitude) { //step 5 - check if latitude and long is available
      return (
        <SafeAreaView style={styles.container}>
          <MapView
            style={{ flex: 1 }}
            ref={map => { this.map = map; }} // create ref to allow us to acess map anywhere
            showsUserLocation //step 6 - view user location marker 
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421
            }}
            zoomEnabled
            //   mapType="mutedStandard"
            provider="google"
            style={styles.map}
          >
            <MapView.Polyline
              strokeWidth={3}
              strokeColor="#be2edd"
              lineJoin="bevel"
              coordinates={this.state.coords}
            />
            {this.state.destLatitude &&
              <MapView.Marker
                coordinate={{
                  latitude: this.state.destLatitude,
                  longitude: this.state.destLongitude,
                }}

                // pinColor="#000"
                image={require('./assets/marker.png')}
              />}
          </MapView>
          <GooglePlacesAutocomplete
            placeholder='Enter Destination'
            minLength={2}
            autoFocus={false}
            returnKeyType={'search'} // Can be left out for default return key https://facebook.github.io/react-native/docs/textinput.html#returnkeytype
            listViewDisplayed='false'    // true/false/undefined
            fetchDetails={true}
            renderDescription={row => row.description} // custom description render
            onPress={(data, details = null) => { // 'details' is provided when fetchDetails = true
              //console.log(data, details);
              this.geDirections(`${latitude},${longitude}`, data.place_id)
            }}

            getDefaultValue={() => ''}

            query={{
              key: API_KEY,
              language: 'en',
              types: 'address',
              components: 'country:za' //specify the country
            }}

            styles={{
              textInputContainer: {
                backgroundColor: 'rgba(0,0,0,0)',
                borderTopWidth: 0,
                borderBottomWidth: 0
              },
              textInput: {
                marginLeft: 15,
                marginRight: 15,
                borderRadius: 0,
                height: 38,
                color: '#5d5d5d',
                fontSize: 16
              },
              predefinedPlacesDescription: {
                color: '#1faadb'
              },
              listView: {
                backgroundColor: '#fff',
                marginLeft: 15,
                marginRight: 15,
              }
            }}

            /*  currentLocation={true} // Will add a 'Current location' button at the top of the predefined places list
             currentLocationLabel="Current location" */
            nearbyPlacesAPI='GooglePlacesSearch' // Which API to use: GoogleReverseGeocoding or GooglePlacesSearch
            GoogleReverseGeocodingQuery={{
              // available options for GoogleReverseGeocoding API : https://developers.google.com/maps/documentation/geocoding/intro
            }}
            GooglePlacesSearchQuery={{
              // available options for GooglePlacesSearch API : https://developers.google.com/places/web-service/search
              rankby: 'distance',
              types: 'food'
            }}

            filterReverseGeocodingByTypes={['locality', 'administrative_area_level_3']} // filter the reverse geocoding results by types - ['locality', 'administrative_area_level_3'] if you want to display only cities
            //  predefinedPlaces={[homePlace, workPlace]}

            debounce={200} // debounce the requests in ms. Set to 0 to remove debounce. By default 0ms.
          /*  renderLeftButton={() => <Image source={require('path/custom/left-icon')} />}
           renderRightButton={() => <Text>Custom text after the input</Text>} */
          />
          {this.state.destLatitude &&
            <View style={styles.bottomModal}>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', }}>
                <View style={{ alignItems: 'center' }}>
                  <Image source={require('./assets/timer.png')} style={styles.icons} resizeMode='contain' />
                  <Text style={styles.modalHeaderText}>Estimated Duration</Text>
                  <Text style={styles.tripDetails}>{this.state.duration}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Image source={require('./assets/map-points.png')} style={styles.icons} resizeMode='contain' />
                  <Text style={styles.modalHeaderText}>Distance</Text>
                  <Text style={styles.tripDetails}>{this.state.distance}</Text>
                </View>
              </View>
              <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'space-around' }}>
                <View style={{ marginLeft: 15 }}>
                  <Text style={styles.modalHeaderText}>Form:</Text>
                  <Text style={styles.tripDetails}>{this.state.from}</Text>
                </View>
                <View style={{ marginLeft: 15 }}>
                  <Text style={styles.modalHeaderText}>To:</Text>
                  <Text style={styles.tripDetails}>{this.state.to}</Text>
                </View>
              </View>
            </View>
          }
        </SafeAreaView>

      )
    } else {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Enable LOCATION</Text>
        </View>
      )
    }
  }
}

const styles = StyleSheet.create({
  suggestions: {
    backgroundColor: "white",
    padding: 5,
    fontSize: 18,
    borderWidth: 0.5,
    marginLeft: 5,
    marginRight: 5
  },
  destinationInput: {
    height: 40,
    borderWidth: 0.5,
    marginTop: 50,
    marginLeft: 5,
    marginRight: 5,
    padding: 5,
    backgroundColor: "white"
  },
  container: {
    ...StyleSheet.absoluteFillObject
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  /* Moadal */
  bottomModal: {
    justifyContent: "flex-end",
    margin: 0,
    paddingTop: 10,
    height: 195,
    backgroundColor: '#fff'
  },
  modalContent: {
    backgroundColor: "white",
    padding: 22,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  icons: {
    width: 32,
    margin: 0,
    height: 32
  },
  modalHeaderText: {
    fontWeight: '800',
    fontSize: 12,
    color: '#be2edd'
  },
  tripDetails: {
    color: '#5d5d5d',
    fontSize: 12
  }

});
