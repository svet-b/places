## Minor UX

- The view should default to Map rather than List
- The map should show the current location (blue dot like Google Maps) and be centered on it

## Cities

- The city should default to Paris. Other options may be added in the future, but this should be set for now
- The user should not be asked to set the city when adding a location

## Adding locations

- There should not be separate "Add" and "Screenshot" buttons. There should just be a single "Add" button that then gives options
- When the user presses the "Add" button they should see the following options:
  - At the top, an "upload screenshot" button. If they click this they see a thumbnail and can click the "Analyze" button, as now
  - Below this two textboxes that do Google Maps search:
    - In the first one they can enter a Google Maps URL (i.e. shared from Google Maps). If they do this the place information gets pulled based on the URL that was entered
    - In the second one they can do a Google Maps search based on the place name. This should work more or less as it does now (see caveate below)
- The above options (screenshot upload + analysis, or Google Maps URL, or Google Maps search) should be used to uniquely identify the actual place. I.e. to populate the following fields in the Google Sheet: name, address, lat, lng, google_place_id, google_maps_url. Then the other bits of metadata should still be something that the user can enter, namely: priority, category (ideally auto-populated but still editable), cuisine, source (auto-populated if screenshot), list, notes, visited

### Adding from Screenshot
- Currently the Google Maps location (or address, lat, long, etc) are not populated if the upload method is used. Even though the place is identified correctly.
- The screenshot upload also didn't work when attempted. Perhaps there's an issue with the sharing (though I did create the "Places Screenshots" folder and shared it with the Google service account)

### Adding manually
- There is a glitch, in that currently the search appears to be global, rather than based on the user's location or the selected city (default Paris). E.g. if I type in "Candelaria" the first two results are in the Philippines, even though I obviously mean the restaurant in Paris.