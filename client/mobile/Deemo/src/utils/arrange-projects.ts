// The Projects list: a filter (whose manuscripts, or the ones still needing a look), then a sort.

export type ProjectSort = "newest" | "oldest" | "name";
export type ProjectShow = "all" | "mine" | "joined" | "review";

export const PROJECT_SORTS: { value: ProjectSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Title A–Z" },
];
export const PROJECT_SHOWS: { value: ProjectShow; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "joined", label: "Joined" },
  { value: "review", label: "Needs review" },
];

type Arrangeable = {
  name: string;
  createdAt: string;
  status: "analyzing" | "ready" | "failed";
  confirmedAt?: string;
  analysis?: { title?: string };
  group?: { isOwner: boolean };
};

// Still reading, failed, or a summary nobody has checked yet.
export const needsReview = (p: Arrangeable) => p.status !== "ready" || !p.confirmedAt;
const title = (p: Arrangeable) => (p.analysis?.title || p.name).toLowerCase();

export function arrangeProjects<T extends Arrangeable>(list: T[], sort: ProjectSort, show: ProjectShow): T[] {
  const kept = list.filter((p) =>
    show === "mine" ? !p.group || p.group.isOwner : show === "joined" ? !!p.group && !p.group.isOwner : show === "review" ? needsReview(p) : true,
  );
  const time = (p: T) => new Date(p.createdAt).getTime();
  return kept.sort((a, b) =>
    sort === "name" ? title(a).localeCompare(title(b)) || time(b) - time(a) : sort === "oldest" ? time(a) - time(b) : time(b) - time(a),
  );
}
