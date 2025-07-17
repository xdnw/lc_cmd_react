import EndpointWrapper from "@/components/api/bulkwrapper";
import { TABLE } from "@/lib/endpoints";
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

  const { permission: edit } = usePermission(['conflict', 'edit', 'rename']);

  const [syncIds, setSyncIds] = useState<number[]>([]);


  return (
    <>
      <h1>Conflicts</h1>
      {/* <EndpointWrapper endpoint={TABLE} args={{
        type: 'Conflict',
        selection_str: '*',
        columns: builder.array(),
      }}>
        {({ data }) => {
          return <pre className="whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>;
        }}
      </EndpointWrapper> */}

      <StaticTable type="Conflict" selection={{ "": "*" }} columns={builder.aliasedArray()} />
    </>
  );
}