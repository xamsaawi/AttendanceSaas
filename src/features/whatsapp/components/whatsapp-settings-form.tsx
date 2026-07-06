"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { sendTestWhatsappMessage, updateWhatsappSettings } from "@/features/whatsapp/actions";
import type { listWhatsappMessages } from "@/features/whatsapp/queries";
import { whatsappSettingsSchema, type WhatsappSettingsInput } from "@/lib/validations/whatsapp";

// Select.Value only renders the raw stored value unless given a mapping
// function (see src/components/ui/select.tsx) — this form's provider values
// ("none"/"twilio"/"whatsapp_cloud_api") aren't human-readable on their own.
const PROVIDER_LABELS: Record<string, string> = {
  none: "None",
  twilio: "Twilio",
  whatsapp_cloud_api: "Meta WhatsApp Cloud API",
};

export function WhatsappSettingsForm({
  defaultValues,
  recentMessages,
}: {
  defaultValues: WhatsappSettingsInput;
  recentMessages: Awaited<ReturnType<typeof listWhatsappMessages>>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WhatsappSettingsInput>({
    resolver: zodResolver(whatsappSettingsSchema),
    defaultValues,
  });

  // react-hook-form's watch() disables React Compiler memoization for this
  // component (logged as a lint warning, not an error) — accepted since the
  // enabled/disabled badge genuinely needs to react live as the switch flips.
  const isEnabled = watch("isEnabled");
  const provider = watch("provider");

  async function onSubmit(data: WhatsappSettingsInput) {
    setIsSubmitting(true);
    const result = await updateWhatsappSettings(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("WhatsApp settings saved");
  }

  async function handleSendTest() {
    setIsSendingTest(true);
    const result = await sendTestWhatsappMessage(testPhone);
    setIsSendingTest(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (result.outcome === "sent") {
      toast.success("Test message sent — check the message log below");
    } else if (result.outcome === "disabled") {
      toast.warning("Sending is disabled, so nothing was sent — logged as 'disabled' instead");
    } else {
      toast.error("Test message failed to send — see the error in the message log below");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="flex items-center gap-2">
          <Badge variant={isEnabled ? "default" : "outline"}>
            {isEnabled ? "Sending enabled" : "Sending disabled — logged only"}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-provider">Provider</Label>
            <Controller
              control={control}
              name="provider"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="whatsapp-provider" className="w-full">
                    <SelectValue placeholder="None">{(value: string) => PROVIDER_LABELS[value] ?? value}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="whatsapp_cloud_api">Meta WhatsApp Cloud API</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Controller
              control={control}
              name="isEnabled"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} id="whatsapp-enabled" />
              )}
            />
            <Label htmlFor="whatsapp-enabled">Enable sending</Label>
          </div>
          {provider === "twilio" && (
            <div className="space-y-2">
              <Label htmlFor="whatsapp-account-sid">Account SID</Label>
              <Input id="whatsapp-account-sid" {...register("accountSid")} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone">
              {provider === "whatsapp_cloud_api" ? "Phone number ID" : "WhatsApp sender number"}
            </Label>
            <Input
              id="whatsapp-phone"
              placeholder={provider === "whatsapp_cloud_api" ? "123456789012345" : "+14155238886"}
              {...register("phoneNumberId")}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="whatsapp-token">Auth token</Label>
            <Input id="whatsapp-token" type="password" autoComplete="off" {...register("accessToken")} />
            {errors.accessToken && (
              <p className="text-destructive text-sm">{errors.accessToken.message}</p>
            )}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </form>

      <div className="space-y-2 border-t pt-4">
        <Label htmlFor="whatsapp-test-phone">Send a test message</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="whatsapp-test-phone"
            placeholder="+1234567890"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="max-w-xs"
          />
          <Button type="button" variant="outline" disabled={isSendingTest} onClick={handleSendTest}>
            {isSendingTest ? "Sending..." : "Send test message"}
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label>Message log</Label>
        {recentMessages.length === 0 ? (
          <p className="text-muted-foreground text-sm">No messages sent yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentMessages.map((message) => (
              <li
                key={message.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium">{message.recipient_phone}</span>
                  <span className="text-muted-foreground ml-2">
                    {format(new Date(message.created_at), "MMM d, HH:mm")}
                  </span>
                  {message.error && <p className="text-destructive text-xs">{message.error}</p>}
                </div>
                <Badge
                  variant={
                    message.status === "sent"
                      ? "default"
                      : message.status === "failed"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {message.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
