# Phase 3 — Edit and Delete

Goal: Full CRUD — users can edit place details and delete places, with optimistic UI updates that sync to Google Sheets.

**Depends on:** Phase 2 complete (map view, list view, place detail panel all working).

---

## Step 1: Backend — PUT and DELETE Routes

### PUT /places/:id

**In routes/places.ts:**
- Accept a JSON body with the fields to update (partial update — only send changed fields)
- Call a new `updatePlace(env, id, updates)` function in sheets.ts

**In sheets.ts — `updatePlace(env, id, updates)`:**
1. Read all rows via `spreadsheets.values.get` for `places!A:Q`
2. Find the row index where column A (id) matches the `:id` param
3. If not found, return 404
4. Merge the updates into the existing row data
5. Call `spreadsheets.values.update` on the specific range `places!A{rowIndex}:Q{rowIndex}` with `valueInputOption=RAW`
6. Return the updated place object

### DELETE /places/:id

**In routes/places.ts:**
- No request body needed

**In sheets.ts — `deletePlace(env, id)`:**
1. Read all rows to find the row index for the given id
2. If not found, return 404
3. Call `spreadsheets.batchUpdate` with a `deleteDimension` request:
   ```json
   {
     "requests": [{
       "deleteDimension": {
         "range": {
           "sheetId": 0,
           "dimension": "ROWS",
           "startIndex": rowIndex,
           "endIndex": rowIndex + 1
         }
       }
     }]
   }
   ```
   Note: `sheetId` is the numeric ID of the tab (usually 0 for the first tab), not the spreadsheet ID. You may need to look this up via the spreadsheet metadata or hardcode it.
4. Return 204 No Content

---

## Step 2: Frontend API Client

**In api/client.ts, add:**
- `updatePlace(id: string, updates: Partial<Place>): Promise<Place>` — `PUT /places/:id`
- `deletePlace(id: string): Promise<void>` — `DELETE /places/:id`

---

## Step 3: Optimistic State Management

**In usePlaces.ts hook (or equivalent state management):**

The hook should manage:
- `places: Place[]` — the local array
- `loading: boolean` — initial load state
- `error: string | null` — last sync error

Expose mutation functions that update local state first, then sync:

**`updatePlace(id, updates)`:**
1. Save a snapshot of the current place (for rollback)
2. Update the place in the local `places` array immediately
3. Fire `apiClient.updatePlace(id, updates)` in background
4. On success: no-op (UI already updated)
5. On failure: revert to snapshot, show toast with error message

**`deletePlace(id)`:**
1. Save a snapshot of the deleted place and its index
2. Remove from local `places` array immediately
3. Fire `apiClient.deletePlace(id)` in background
4. On success: no-op
5. On failure: re-insert at original index, show toast

**`createPlace(place)`:** (refactor from Phase 1)
1. Generate the `id` client-side (8-char random alphanumeric)
2. Set `date_added` to today's ISO date
3. Set `visited` to `false`
4. Add to local `places` array immediately
5. Fire `apiClient.createPlace(place)` in background
6. On failure: remove from array, show toast

---

## Step 4: Edit UI in Place Detail

**PlaceDetail.tsx updates:**
- Add an "Edit" button that switches the detail view to edit mode
- In edit mode, fields become editable inputs:
  - `name`: text input
  - `category`: select dropdown with category options
  - `priority`: select (1, 2, 3)
  - `cuisine`: text input
  - `address`: text input (plain text for now; Autocomplete added in Phase 5)
  - `source`: text input
  - `list`: text input
  - `notes`: textarea
  - `city`: text input
- "Save" button: calls `updatePlace(id, changedFields)` and exits edit mode
- "Cancel" button: discards changes and exits edit mode

**Visited toggle:**
- Always visible (not just in edit mode) as a prominent toggle/checkbox
- On tap, immediately calls `updatePlace(id, { visited: !current })` with optimistic update
- Visual indicator: e.g. checkmark badge on the place card, or "Visited" / "Want to go" label

---

## Step 5: Delete UI

**In PlaceDetail.tsx:**
- Add a "Delete" button (styled as destructive — red text or icon)
- On tap, show a confirmation dialog: "Delete {place name}?"
- On confirm, call `deletePlace(id)`, close the detail panel, return to map/list

---

## Step 6: Toast Notifications

**Add a simple toast system:**
- A small floating notification at the bottom of the screen
- Shows on sync errors: "Failed to save changes. Tap to retry."
- Auto-dismiss after 4 seconds, or on tap
- Can be a simple component with state managed via a context or a lightweight store

---

## Testing

1. Edit a place's name and category — verify it updates in the UI immediately and in Google Sheets within a few seconds
2. Toggle visited status — verify optimistic update
3. Delete a place — verify it disappears from UI and from the sheet
4. Simulate a network error (e.g. wrong API key temporarily) — verify the UI reverts and shows a toast
5. Rapid edits — verify they don't conflict (each update reads the current row before writing)

---

## Definition of Done

- [ ] `PUT /places/:id` updates a specific row in Google Sheets
- [ ] `DELETE /places/:id` removes a row from Google Sheets
- [ ] Editing a place in the detail view persists changes
- [ ] Visited toggle works with optimistic update
- [ ] Deleting a place removes it from UI and sheet (with confirmation)
- [ ] Failed syncs show a toast and revert the optimistic update
- [ ] All CRUD operations work end-to-end (create from Phase 1 also refactored to be optimistic)
