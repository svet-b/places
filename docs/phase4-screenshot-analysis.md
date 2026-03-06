# Phase 4 — Screenshot Analysis

Goal: Upload a screenshot (e.g. from Instagram), have Claude Vision extract place info, resolve it via Google Places API, and pre-fill the add-place form.

**Depends on:** Phase 3 complete (full CRUD working).

---

## Step 1: Backend — Claude Vision Integration

### POST /analyze-screenshot

**In routes/analyze.ts:**
- Accept a JSON body: `{ image: string }` (base64-encoded image data, with or without data URL prefix)
- Strip the data URL prefix if present (`data:image/...;base64,`)
- Call Claude Vision API

**In services/vision.ts — `analyzeScreenshot(env, imageBase64)`:**
- Call the Anthropic Messages API (`https://api.anthropic.com/v1/messages`) with:
  - Model: `claude-sonnet-4-6` (good balance of speed/quality for this task)
  - Content: an image block (base64 source) + text prompt
  - `max_tokens`: 1024

**Prompt:**
```
Look at this screenshot and extract information about a place (restaurant, cafe, bar, shop, etc.) that is being shown or recommended.

Return a JSON object with these fields (use null for any you can't determine):
{
  "name": "place name",
  "category": "one of: coffee, restaurant, bar, bakery, shop, park, culture, other",
  "city": "city name",
  "address_hint": "any address or location info visible",
  "source_account": "social media account name if visible (e.g. @username)",
  "source_platform": "platform name if identifiable (e.g. Instagram, TikTok, Google Maps)",
  "notes": "any other relevant details (cuisine type, what they're known for, etc.)"
}

Return ONLY the JSON object, no other text.
```

- Parse the response JSON. If parsing fails, return partial results with whatever was extracted.

**Secrets to set:**
- `ANTHROPIC_API_KEY` — your Anthropic API key (via `wrangler secret put`)

### POST /resolve-place

**In routes/places.ts (or a new resolve.ts):**
- Accept: `{ name: string, city?: string }`
- Call Google Places API to resolve to a full address and coordinates

**In services/places-api.ts — `resolvePlace(env, name, city)`:**
- Use the Google Places API (New) Text Search endpoint:
  ```
  POST https://places.googleapis.com/v1/places:searchText
  Headers:
    X-Goog-Api-Key: <API_KEY>
    X-Goog-FieldMask: places.displayName,places.formattedAddress,places.location,places.id,places.googleMapsUri
  Body:
    { "textQuery": "{name} {city}" }
  ```
- From the first result, extract:
  - `name` (may be more accurate than the screenshot)
  - `address` (formattedAddress)
  - `lat`, `lng` (location.latitude, location.longitude)
  - `google_place_id` (id)
  - `google_maps_url` (googleMapsUri)
- Return the resolved data

**Secret needed:**
- `GOOGLE_PLACES_API_KEY` — can be the same backend API key used for Sheets, or a separate one restricted to Places API

### Full analysis endpoint (option)

You can either:
- **Two calls from frontend**: POST /analyze-screenshot, then POST /resolve-place with the result
- **Single call from backend**: POST /analyze-screenshot does both — analyzes the image, then resolves the place, returning merged results

Recommend the single-call approach for simplicity. The analyze endpoint calls vision, then calls resolve internally, and returns the merged result.

---

## Step 2: Backend — Google Drive Upload

### POST /upload-image

**In routes/upload.ts:**
- Accept: `{ image: string, filename: string }` (base64 image + a filename like `{placeId}.jpg`)
- Upload to Google Drive and return the public URL

**In services/drive.ts — `uploadImage(env, imageBase64, filename)`:**
1. Use the same service account auth (JWT → access token) as Sheets
2. Upload via Drive API multipart upload:
   ```
   POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
   ```
   - Metadata part: `{ name: filename, parents: [DRIVE_FOLDER_ID] }`
   - Media part: the image bytes (decode from base64), with appropriate MIME type
3. After upload, set permissions to "anyone with the link can view":
   ```
   POST https://www.googleapis.com/drive/v3/files/{fileId}/permissions
   Body: { "type": "anyone", "role": "reader" }
   ```
4. Return the web view link: `https://drive.google.com/uc?id={fileId}`

**Prerequisites:**
- Create a "Places Screenshots" folder in Google Drive
- Share it with the service account email as Editor
- Note the folder ID from the URL
- Set as secret: `DRIVE_FOLDER_ID`

---

## Step 3: Frontend — Screenshot Upload Flow

### ScreenshotUpload.tsx

This is a new flow accessible from the "Add Place" UI (e.g. a tab or button: "Add from Screenshot").

**UI flow:**

1. **Upload step:**
   - File input (accept `image/*`) or camera capture
   - Show image preview after selection
   - "Analyze" button to submit

2. **Analyzing state:**
   - Show a loading spinner/skeleton over the image preview
   - Text: "Analyzing screenshot..."

3. **Review step:**
   - Pre-filled form with extracted data:
     - Name (from Claude + Google Places)
     - Category (from Claude, as a dropdown)
     - Address (from Google Places)
     - City (from Claude or Google Places)
     - Source (combined: `{source_platform} — {source_account}`)
     - Notes (from Claude)
   - All fields are editable — user can correct anything
   - Map preview pin showing the resolved location (if lat/lng available)
   - "Save" button to create the place

4. **Saving:**
   - Call `createPlace()` with the form data
   - In parallel, call `POST /upload-image` with the screenshot
   - On upload success, update the place with `screenshot_url`
   - Navigate to the newly created place's detail view

**Error handling:**
- If Claude can't identify a place: show a message "Couldn't identify a place. Please fill in the details manually." Pre-fill whatever partial data was extracted.
- If Google Places can't resolve: show the form without address/coordinates. User can type an address manually.
- If image upload fails: save the place without the screenshot, show a toast.

---

## Step 4: Image Handling Details

**Image compression before upload:**
- On the frontend, before sending to the backend, resize large images to max 1200px on the longest side
- Use canvas API to compress to JPEG at ~80% quality
- This reduces upload size and Claude API costs (smaller base64 payload)

**Implementation (utility function):**
```ts
async function compressImage(file: File, maxSize = 1200): Promise<string> {
  // Create image from file
  // Draw to canvas at reduced size
  // Export as JPEG base64
  // Return base64 string (without data URL prefix)
}
```

---

## Testing

1. Take a screenshot of an Instagram post recommending a cafe
2. Upload it through the app
3. Verify Claude extracts the place name and relevant details
4. Verify Google Places resolves the address and coordinates
5. Review and edit the pre-filled form, then save
6. Verify the place appears on the map at the correct location
7. Verify the screenshot is viewable in the place detail view
8. Test with various screenshot types: Instagram post, Instagram story, Google Maps, TikTok, a blog post
9. Test failure cases: unrelated image, blurry screenshot, place that doesn't exist on Google

---

## Definition of Done

- [ ] `POST /analyze-screenshot` extracts place info from an image via Claude Vision
- [ ] `POST /resolve-place` resolves a place name to address/coordinates via Google Places API
- [ ] `POST /upload-image` uploads an image to Google Drive and returns a public URL
- [ ] Frontend has a screenshot upload flow with image preview and "Analyze" button
- [ ] Extracted data pre-fills the add-place form for user review
- [ ] Saved places include the screenshot URL and display it in the detail view
- [ ] Error cases are handled gracefully (partial data, unresolvable places)
