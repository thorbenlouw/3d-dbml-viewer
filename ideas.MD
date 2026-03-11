1. [X] Clicking on a table title should move the table to the center of the view and zoom in on it. This allows users to quickly focus on a specific table and its relationships without having to manually navigate through the diagram.
2. Icons for NN, FK, PK, 
3. [X] "Referenced by" as well as "Referenced tables"
4. Incoming references on left, Outgoing on right
5. [X] Table groups (have all tables in a transparent colour block/shape) -- respect `color` setting
6. [X] Support colours etc. from Table settings.
7. [REMOVED] Navigate/Rearrange toggle
8. [REMOVED] Bug where text disappears after Rearrange
9. [X] Double click on table flies to in front of it
10. [X] Clean up presentation on right 
11. [X] Render project names and descriptions from DBML `Project` blocks. Render project notes
12. [X] Explicitly check that `TablePartials` are supported in the load
13. Check for `default`  values and render it in the table card (↩️)
14. Render `checks` on the table card in a section (hovers on the name of the check to see the details revealed in the nav panel tooltip, with fields highlighted)
15. Render `indexes` on the table card ina section (hovers on the name of the index or other icon to see the details revealed in the nav panel tooltip, with fields highlighted)
16. [X] Hovering on a connection should show the referenced fields being highlighted in the tables 
17. Render connection type (one-to-one, one-to-many, many-to-one, many-to-many) on the connection line somehow
18. Where a ref has a name (e.g. `Ref: users.id > posts.user_id [name: "UserPosts"]`), render that name on the connection line
19. Support for rendering `Enum` types in the table cards, showing the possible values with a special enum indicator
20. Support for relationship settings (cascade, colours etc) in the side bar when a connection is selected
21. Support markdown rendering in Notes
22. Support TableGroup Notes (on hover over Tablegroup name)
23. Support Sticky notes (as floating notes in the space)
24. `records` and table samples -- allow rendering from button in button, pops up as dismissable floating 3D dialog in front of user. 
25.[X] Add a button "connection +/-" (press and hold to adjust) that allows  modifying the length of connections setting from the default (pack tables tighter or looser)
26. [X] Add a "Zoom +/-" button (press and hold to adjust) that allows the user to just zoom out into space from their current position, keeping the centre and direction as is. Allows users to get a view of the whole diagram without manual zoom /fly.
27. [X] Make table titles get relatively bigger the further away they are, so what a table is stays legible even for distant tables (col font size stays proportionally small though)
28. [X] When a table is brought into focus, the other tables rearrange themselves so that directly linked tables travel to be "nearby" (preferably in the same plane), and unrelated tables move further away. This allows users to focus on the relevant part of the diagram while still having a sense of the overall structure.
29. [X] Double-click again on "sticky" table to stop it being the centre of the view. A table that is currently the sticky one, should have a glowing visual indicator around the table border.
30. A Dockerfile for quick docker run (of built artefacts)
31. When a table is selected as sticky (double-click), then only the table and its direct referenced tables should be opaque and other tables become much more (almost completely) transparent. Tables one hope away should be normally opaque. Tables 2 hops away should be 50% transparent. Tables more than 2 hops away should be 90% transparent. This allows users to focus on the relevant part of the diagram while still having a sense of the overall structure.