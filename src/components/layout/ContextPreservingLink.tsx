import { useMemo } from "react";
import { Link, useLocation, type LinkProps } from "react-router-dom";

import { useSession } from "@/components/api/SessionContext";

import {
  buildContextPreservedTo,
  type SearchParamInput,
  RETURN_TO_PARAM,
} from "./contextPreservingNavigation";

export interface ContextPreservingLinkProps extends Omit<LinkProps, "to"> {
  to: LinkProps["to"];
  preserveSearchParams?: readonly string[];
  additionalSearchParams?: Record<string, SearchParamInput>;
  requireGuild?: boolean;
  guildSelectPath?: string;
  returnToParam?: string;
}

export default function ContextPreservingLink({
  to,
  preserveSearchParams,
  additionalSearchParams,
  requireGuild = false,
  guildSelectPath = "/guild_select",
  returnToParam = RETURN_TO_PARAM,
  ...props
}: ContextPreservingLinkProps) {
  const location = useLocation();
  const { session } = useSession();

  const resolvedTo = useMemo(() => {
    return buildContextPreservedTo({
      to,
      currentSearch: location.search,
      preserveSearchParams,
      additionalSearchParams,
      requireGuild,
      hasGuild: Boolean(session?.guild),
      guildSelectPath,
      returnToParam,
    });
  }, [
    additionalSearchParams,
    guildSelectPath,
    location.search,
    preserveSearchParams,
    requireGuild,
    returnToParam,
    session?.guild,
    to,
  ]);

  return <Link {...props} to={resolvedTo} />;
}
