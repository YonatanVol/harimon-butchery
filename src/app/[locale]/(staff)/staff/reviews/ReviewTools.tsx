"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { staffModerateReview, staffReplyToReview } from "@/infra/reviews/actions";
import { Button } from "@/ui/primitives/Button";

const MIN_NOTE = 3;

type Problem = { key: "NOT_PERMITTED" | "NOT_FOUND" | "NETWORK" };

function useRun() {
  const t = useTranslations("staff.reviews");
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const run = (call: () => Promise<{ ok: true } | { ok: false; problem: Problem }>) => {
    setProblem(null);
    setDone(false);
    start(async () => {
      const r = await call().catch(() => null);
      if (!r) return setProblem(t("problems.NETWORK"));
      if (!r.ok) return setProblem(t(`problems.${r.problem.key}`));
      setDone(true);
    });
  };
  return { pending, problem, done, run, t };
}

/** Publish or reject one review. Rejecting asks for a reason, which stays inside the shop. */
export function ModerationButtons({ id, status }: { id: string; status: "PENDING" | "PUBLISHED" | "REJECTED" }) {
  const { pending, problem, done, run, t } = useRun();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start gap-2">
        {status !== "PUBLISHED" && (
          <Button size="md" pendingLabel={pending && !rejecting ? t("saving") : null} onClick={() => run(() => staffModerateReview({ id, decision: "PUBLISHED", note: "" }))}>
            {t("publish")}
          </Button>
        )}
        {status !== "REJECTED" && !rejecting && (
          <Button variant="secondary" size="md" onClick={() => setRejecting(true)}>
            {status === "PUBLISHED" ? t("unpublish") : t("reject")}
          </Button>
        )}
      </div>

      {rejecting && (
        <div className="flex flex-col gap-2">
          <label className="text-char-700 text-sm font-medium" htmlFor={`note-${id}`}>
            {t(status === "PUBLISHED" ? "noteUnpublish" : "note")}
          </label>
          <textarea
            id={`note-${id}`}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            rows={2}
            className="bg-bone-50 ring-bone-300 focus-visible:ring-wine-600 rounded-lg p-3 ring-1 outline-none focus-visible:ring-2"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              size="md"
              disabledReason={note.trim().length < MIN_NOTE ? t("noteRequired") : null}
              pendingLabel={pending ? t("saving") : null}
              onClick={() => run(() => staffModerateReview({ id, decision: "REJECTED", note }))}
            >
              {status === "PUBLISHED" ? t("unpublish") : t("reject")}
            </Button>
            <Button variant="ghost" size="md" onClick={() => setRejecting(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}

      {done && (
        <p role="status" className="text-ok-600 text-sm font-medium">
          {t("saved")}
        </p>
      )}
      {problem && (
        <p role="alert" className="text-bad-600 text-sm font-medium">
          {problem}
        </p>
      )}
    </div>
  );
}

/** The butcher's public answer under a review. */
export function ReplyBox({ id, current }: { id: string; current: string | null }) {
  const { pending, problem, done, run, t } = useRun();
  const [body, setBody] = useState(current ?? "");

  return (
    <div className="flex flex-col gap-2">
      <label className="text-char-700 text-sm font-medium" htmlFor={`reply-${id}`}>
        {t("reply")}
      </label>
      <p className="text-char-500 text-sm">{t("replyHelp")}</p>
      <textarea
        id={`reply-${id}`}
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 600))}
        rows={2}
        className="bg-bone-50 ring-bone-300 focus-visible:ring-wine-600 rounded-lg p-3 ring-1 outline-none focus-visible:ring-2"
      />
      <div className="flex flex-wrap items-start gap-2">
        <Button
          variant="secondary"
          size="md"
          disabledReason={body.trim() === (current ?? "").trim() ? t("noChange") : null}
          pendingLabel={pending ? t("saving") : null}
          onClick={() => run(() => staffReplyToReview({ id, body }))}
        >
          {/* An empty box only ever "removes" when there is a reply there to remove. */}
          {!body.trim() && current ? t("replyRemove") : t("replySave")}
        </Button>
      </div>
      {done && (
        <p role="status" className="text-ok-600 text-sm font-medium">
          {t("saved")}
        </p>
      )}
      {problem && (
        <p role="alert" className="text-bad-600 text-sm font-medium">
          {problem}
        </p>
      )}
    </div>
  );
}
