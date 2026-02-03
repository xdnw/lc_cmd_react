import { useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { SET_GUILD } from "@/lib/endpoints";
import { useDialog } from "../../components/layout/DialogContext";
import { SetGuild } from "../../lib/apitypes";
import { UNSET_GUILD } from "../../lib/endpoints";
import { useSession } from "@/components/api/SessionContext";
import { ApiFormInputs } from "@/components/api/apiform";
import LazyIcon from "@/components/ui/LazyIcon";


const GuildPicker = () => {
    const { session, error, setSession, refetchSession } = useSession();
    const { showDialog } = useDialog();

    const handleResponse = useCallback((data: SetGuild) => {
        refetchSession();

        showDialog("Guild Set", <div className="flex items-center">
            <img src={data.icon} alt="Guild Icon" className="w-8 h-8 mr-2" />
            <span>Selected guild with id {data.id} and name {data.name}</span>
        </div>, false);
    }, [refetchSession, showDialog]);

    return (
        <>
            <Button variant="outline" size="sm" asChild>
                <Link to={`${process.env.BASE_PATH}home`}>
                    <LazyIcon name="ChevronLeft" className="h-4 w-4" />Home
                </Link>
            </Button>
            <div className="bg-light/10 border border-light/10 p-2 m-0 mt-2">
                {session?.guild && <SelectedGuildInfo id={session.guild} name={session.guild_name} icon={session.guild_icon} />}
                <div className="bg-accent p-2 rounded relative">
                    <h1 className="text-lg font-bold">Don't see your server here? </h1>
                    <Link className="text-blue-600 hover:text-blue-800 underline" to={`${process.env.BOT_INVITE}`}>Invite {process.env.APPLICATION}</Link> to your server,
                    then see the <Link className="text-blue-600 hover:text-blue-800 underline" to={`${process.env.WIKI_URL}/initial_setup`}>Wiki</Link> for installation instructions.
                </div>
                <hr className="my-2" />
                <GuildForm handleResponse={handleResponse} />
            </div>
        </>
    );
};

const GuildForm = (({ handleResponse }: { handleResponse: (data: SetGuild) => void }) => {
    const handleResponseCallback = useCallback(({ data }: { data: SetGuild }) => {
        handleResponse(data);
    }, [handleResponse]);
    return <ApiFormInputs
        endpoint={SET_GUILD}
        message={<>
            <h2 className="text-lg font-extrabold">Guild Select:</h2>
            <p>
                Select your guild using the dropdown below, then press the <kbd>Submit</kbd> button<br />
            </p>
        </>}
        handle_response={handleResponseCallback}
    />
});

const SelectedGuildInfo = memo(({ id, name, icon }: { id: string, name?: string, icon?: string }) => {
    return <GuildCard id={id} name={name} icon={icon} />;
});


const GuildCard = memo(({ id, name, icon }: { id: string | null, name: string | undefined, icon: string | undefined }) => {
    const { refetchSession } = useSession();
    const { showDialog } = useDialog();

    const setGuild = useCallback(() => {
        UNSET_GUILD.endpoint.call({}).then(() => {
            refetchSession();
            showDialog("Guild Unset", "Successfully unset guild");
        }).catch(error => {
            showDialog("Failed to unset guild", error + "");
        });
    }, [refetchSession, showDialog]);

    return (
        <>
            {id && (
                <div className="bg-accent p-2 relative rounded">
                    <h1 className="text-lg font-bold">Currently Selected</h1>
                    <p className="pb-1">
                        {icon && <img src={icon} alt={name} className="w-4 h-4 inline-block mr-1" />}
                        {name ? name + " | " : ""}
                        {id ? id : "N/A"}
                    </p>
                    <Button onClick={setGuild} variant="outline" size="sm" className="border-slate-600 absolute top-2 right-2">
                        Remove
                    </Button>
                </div>
            )}
        </>
    );
});

export default GuildPicker;