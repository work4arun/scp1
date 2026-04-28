import SmTasks from "../../sm/tasks/page";
// Super Admin gets the full task register view (same component, same powers).
export default async function AdminTasks(props: Parameters<typeof SmTasks>[0]) {
  return SmTasks(props);
}
