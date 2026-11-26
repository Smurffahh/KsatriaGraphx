"use client";

import * as React from "react";
import { ArrowUpCircle, ExternalLink, RefreshCw, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isNativeApp } from "@/lib/platform";
import type { AppVersionResponse } from "@/lib/version";

interface UpdateNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss: () => void;
  versionData?: AppVersionResponse | null;
  currentVersion: string;
}

export function UpdateNoticeModal({
  isOpen,
  onClose,
  onDismiss,
  versionData,
  currentVersion,
}: UpdateNoticeModalProps) {
  const isNative = isNativeApp();
  const latestVersion = versionData?.latestVersion || currentVersion;
  const changelog = versionData?.changelogLines || [];
  const downloadUrl = versionData?.downloadUrl;
  const releaseUrl =
    versionData?.releaseUrl || "https://github.com/Smurffahh/KsatriaGraphx/releases";

  const handleDownloadApk = () => {
    const targetUrl = downloadUrl || releaseUrl;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    onDismiss();
  };

  const handleReloadWeb = () => {
    window.location.reload();
  };

  const handleOpenReleasePage = () => {
    window.open(releaseUrl, "_blank", "noopener,noreferrer");
  };

  const formattedDate = versionData?.publishedAt
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(versionData.publishedAt))
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ArrowUpCircle className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Pembaruan Versi Tersedia
              </DialogTitle>
              {formattedDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dirilis pada {formattedDate}
                </p>
              )}
            </div>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Versi terbaru Ksatria Graphx telah tersedia dengan peningkatan fitur dan stabilitas.
          </DialogDescription>
        </DialogHeader>

        {/* Versi comparison badge */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Versi Terpasang</span>
            <span className="font-mono font-medium text-foreground">
              v{currentVersion}
            </span>
          </div>
          <div className="text-muted-foreground">→</div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">Versi Baru</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-primary">
                v{latestVersion}
              </span>
              <Badge variant="outline" className="border-primary/30 text-primary text-xs py-0.5 px-2">
                Baru
              </Badge>
            </div>
          </div>
        </div>

        {/* Catatan Rilis / Changelog */}
        {changelog.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Catatan Rilis
            </span>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-card p-3.5 text-sm text-foreground space-y-2 scrollbar-thin">
              {changelog.map((line, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500 mt-0.5" />
                  <span className="leading-relaxed">{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onDismiss}
            className="w-full sm:w-auto"
          >
            Nanti Saja
          </Button>

          {isNative ? (
            <Button
              type="button"
              onClick={handleDownloadApk}
              className="w-full sm:w-auto gap-2"
            >
              <ExternalLink className="size-4" />
              Unduh & Pasang APK
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenReleasePage}
                className="w-full sm:w-auto gap-1.5"
              >
                <ExternalLink className="size-3.5" />
                Detail Rilis
              </Button>
              <Button
                type="button"
                onClick={handleReloadWeb}
                className="w-full sm:w-auto gap-2"
              >
                <RefreshCw className="size-4" />
                Muat Ulang Versi Baru
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
