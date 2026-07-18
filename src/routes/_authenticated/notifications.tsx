import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  deleteAllNotifications,
} from "@/lib/eduflow.functions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({ component: Page });

function Page() {
  const fn = useServerFn(listNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const delOne = useServerFn(deleteNotification);
  const delAll = useServerFn(deleteAllNotifications);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["notifs"], queryFn: () => fn() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifs"] });
  const mAll = useMutation({ mutationFn: () => markAll(), onSuccess: invalidate });
  const mOne = useMutation({ mutationFn: (id: string) => markOne({ data: { id } }), onSuccess: invalidate });
  const dOne = useMutation({ mutationFn: (id: string) => delOne({ data: { id } }), onSuccess: invalidate });
  const dAll = useMutation({ mutationFn: () => delAll(), onSuccess: invalidate });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6 gap-2 flex-wrap">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mAll.mutate()}>Mark all read</Button>
          <Button
            variant="outline"
            onClick={() => { if (confirm("Delete all notifications?")) dAll.mutate(); }}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Clear all
          </Button>
        </div>
      </div>
      {!data || data.notifications.length === 0 ? (
        <p className="text-muted-foreground">No notifications.</p>
      ) : (
        <ul className="space-y-2">{data.notifications.map((n: any) => (
          <li key={n.id} className={`rounded-lg border p-4 flex items-start gap-3 ${!n.read_at ? "bg-card" : "bg-card/50"}`}>
            <div
              className="flex-1 cursor-pointer"
              onClick={() => !n.read_at && mOne.mutate(n.id)}
            >
              <div className="flex justify-between gap-2">
                {n.link ? (
                  <Link to={n.link} className="font-medium hover:underline">{n.title}</Link>
                ) : (
                  <p className="font-medium">{n.title}</p>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); dOne.mutate(n.id); }}
              aria-label="Delete notification"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}</ul>
      )}
    </div>
  );
}
