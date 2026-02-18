import { StaticTable } from "@/pages/custom_table/StaticTable";
import { CM } from "@/utils/Command";
import { usePermission } from "@/utils/PermUtil";
import { useState } from "react";

const builder = CM.placeholders('Conflict')
  .aliased()
  .add({ cmd: 'getid', alias: 'ID' })
  .add({ cmd: 'getname', alias: "Name" })
  .add({ cmd: 'getcategory', alias: 'Category' })
  .add({ cmd: 'getstartturn', alias: 'Start' })
  .add({ cmd: 'getendturn', alias: 'End' })
  .add({ cmd: 'getactivewars', alias: 'Active Wars' })
  .add({ cmd: 'getdamageconverted', args: { 'isPrimary': 'true' }, alias: 'c1_damage' })
  .add({ cmd: 'getdamageconverted', args: { 'isPrimary': 'false' }, alias: 'c2_damage' })

export default function Conflicts() {
  /*
/conflict sync website <id>
  */
  // conflict addAllForNation

  const { permission: edit } = usePermission(['conflict', 'edit', 'rename']);

  const [syncIds, setSyncIds] = useState<number[]>([]);

  console.log("Conflicts page rendered with edit permission:", edit);

  // AnyCommandPath[]
  // Commands: 
  // conflict sync website -> [{"name":"conflicts","type":"Set<Conflict>","optional":true},{"name":"upload_graph","type":"boolean","optional":true},{"name":"reinitialize_wars","type":"boolean","optional":true},{"name":"reinitialize_graphs","type":"boolean","optional":true}]
  // conflict create -> [{"name":"category","type":"ConflictCategory","optional":false},{"name":"coalition1","type":"Set<DBAlliance>","optional":false},{"name":"coalition2","type":"Set<DBAlliance>","optional":false},{"name":"start","type":"long[Timestamp]","optional":false},{"name":"end","type":"long[Timestamp]","optional":false},{"name":"conflictName","type":"String","optional":true}]
  // there's also: /conflict create_temp col1: col2: start: end:(optional) includegraphs:True/False (optional)

  // conflict edit wiki -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"url","type":"String","optional":false}]
  // conflict edit status -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"status","type":"String","optional":false}]
  // conflict edit casus_belli -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"casus_belli","type":"String","optional":false}]
  // conflict edit category -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"category","type":"ConflictCategory","optional":false}]
  // conflict delete -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"force","type":"boolean","optional":true}]
  // conflict edit end -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"time","type":"long[Timestamp]","optional":false},{"name":"alliance","type":"DBAlliance","optional":true}]
  // conflict edit start -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"time","type":"long[Timestamp]","optional":false},{"name":"alliance","type":"DBAlliance","optional":true}]
  // conflict edit rename -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"name","type":"String","optional":false},{"name":"isCoalition1","type":"boolean","optional":true},{"name":"isCoalition2","type":"boolean","optional":true}]

  // conflict alliance remove -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"alliances","type":"Set<DBAlliance>","optional":false}]
  // conflict alliance add -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"alliances","type":"Set<DBAlliance>","optional":false},{"name":"isCoalition1","type":"boolean","optional":true},{"name":"isCoalition2","type":"boolean","optional":true}]
  // conflict edit add_forum_post -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"url","type":"String","optional":false},{"name":"desc","type":"String","optional":true}]

  // conflict edit add_none_war -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"nation","type":"DBNation","optional":false},{"name":"mark_as_alliance","type":"DBAlliance","optional":false}]
  // conflict alliance add_all_for_nation -> [{"name":"conflict","type":"Conflict","optional":false},{"name":"nation","type":"DBNation","optional":false}]

  // Useful info:
  // CM.get(AnyCommandPath (essentially a typed string[]))
  // TABLE in endpoints.ts might be usefu

  // Need to get the conflicts on page load
  // Figure out how to get a command button
  // Need to refetch the conflict on demand (after edit)
  // A successful command will return a string
  // A failed command will throw an error

  // These commands need to set a flag for resync (i.e. auto fetch won't work, user should have the sync button have a badge with the number of `dirty` conflicts that need to be synced)
  // sync button being `conflict sync website` with the args of the conflicts

  // Figure out what is the best layout for the page (list of conflicts, row buttons to open controls/commands, double click to edit e.g. name, checkboxes next to conflicts, top level buttons/controls for bulk actions)
  // The actual inputs should be generated (there are components for this, though they may need to be modified to look better and not take up so much space)

  // Later: Code the endpoints for the AWS data so it can display the sync status and other details about the conflicts

  const test = (
    <>
      <h1>Conflicts</h1>
      {/* Do I want to extend static table functionality so it can handle having all the buttons/checkboxes added? */}
      <StaticTable type="Conflict" selection={{ "": "*" }} columns={builder.aliasedArray()} />
    </>
  );

  console.log("Conflicts component rendered with test content:", test);

  return test;
}