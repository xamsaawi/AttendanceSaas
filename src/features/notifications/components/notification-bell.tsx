"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { BellIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/actions";
import type { NotificationRow } from "@/features/notifications/queries";
import { createClient } from "@/lib/supabase/client";

const QUERY_KEY = ["notifications"];
const POLL_MS = 30_000;

type NotificationsResponse = { notifications: NotificationRow[]; unreadCount: number };

function useNotificationsRealtime(onChange: () => void) {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session) return;
      channel = supabase
        .channel(`notifications:${session.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${session.user.id}`,
          },
          onChange,
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery<NotificationsResponse>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      return (await res.json()) as NotificationsResponse;
    },
    refetchInterval: POLL_MS,
  });

  useNotificationsRealtime(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  async function handleSelect(notification: NotificationRow) {
    if (!notification.readAt) {
      await markNotificationRead(notification.id);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    }
    if (notification.link) router.push(notification.link);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="relative"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          >
            <BellIcon />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1.5 -right-1.5 h-4 min-w-4 justify-center px-1 text-[10px]"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <PopoverHeader className="flex flex-row items-center justify-between px-3 py-2">
          <PopoverTitle>Notifications</PopoverTitle>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" type="button" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </PopoverHeader>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="text-muted-foreground p-4 text-center text-sm">No notifications yet.</p>
          )}
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleSelect(notification)}
              className="hover:bg-muted flex w-full flex-col items-start gap-0.5 border-t px-3 py-2 text-left first:border-t-0"
            >
              <span className="flex w-full items-center gap-1.5 text-sm font-medium">
                {!notification.readAt && (
                  <span className="bg-primary inline-block size-1.5 shrink-0 rounded-full" />
                )}
                {notification.title}
              </span>
              {notification.body && (
                <span className="text-muted-foreground text-xs">{notification.body}</span>
              )}
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
