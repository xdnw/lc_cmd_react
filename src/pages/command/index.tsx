import React, { useEffect, useState } from 'react';
import CommandComponent from '../../components/cmd/CommandComponent'; // Import CommandComponent
import { withCommands } from '../../utils/StateUtil';
import { Command } from '../../utils/Command';

export default function CommandPage() {
    const [command, setCommand] = useState<Command | null>(null);

    useEffect(() => {
        (async () => {
            const cmdMap = (await withCommands());
            const commandName: string = "deposits convertnegative";
            const fetchedCommand = cmdMap.get(commandName);
            // const fetchedCommand = cmdMap.buildTest();
            setCommand(fetchedCommand);
        })();
    }, []);

    if (!command) {
        console.log("Not command");
        return <div>Loading...</div>; // or some loading spinner
    }
    console.log("Command");
    return (
        <CommandComponent command={command} filterArguments={() => true} defaults={{}} />
    );
}
