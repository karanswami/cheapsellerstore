"use client";

import { LeaderboardTrustBadges } from "@/components/app/leaderboard/leaderboard-trust-badges";
import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import type { HubStat } from "@/components/app/hub/hub-stat-pill";
import { HubEmptyPanel } from "@/components/app/hub/hub-list-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ChevronRight,
  Crown,
  Medal,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import styles from "./leaderboard-board.module.css";

export type LeaderboardBoardEntry = {
  id: string;
  rank: number;
  username: string;
  name: string;
  avatarUrl: string | null;
  isPremium: boolean;
  emailVerified: boolean;
  emojiStatus: string | null;
  isViewer: boolean;
  /** Primary money metric (USD microcents) */
  value: number;
  /** Secondary line, e.g. "8 orders" or "3 referrals · $12 sales" */
  meta: string;
};

export type LeaderboardHeroStat = HubStat;

type LeaderboardBoardProps = {
  title?: string;
  description: string;
  listLabel: string;
  valueLabel: string;
  entries: LeaderboardBoardEntry[];
  /** Viewer row when outside visible list */
  outsider?: LeaderboardBoardEntry | null;
  heroStats?: LeaderboardHeroStat[];
  heroIcon?: ReactNode;
  emptyTitle: string;
  emptyDescription?: string;
  unrankedTitle?: string;
  unrankedDescription?: string;
  showUnrankedAlert?: boolean;
};

function PersonAvatar({
  name,
  username,
  avatarUrl,
  emojiStatus,
  tone,
  size,
}: {
  name: string;
  username: string;
  avatarUrl: string | null;
  emojiStatus: string | null;
  tone: "first" | "second" | "third" | "row";
  size: "podium" | "row";
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const emoji = emojiStatus?.trim() || null;

  return (
    <div
      className={
        size === "podium" ? styles.avatarWrap : styles.rowAvatarWrap
      }
    >
      <div
        className={cn(
          size === "podium" ? styles.avatar : styles.rowAvatar,
          tone === "first" && styles.avatarFirst,
          tone === "second" && styles.avatarSecond,
          tone === "third" && styles.avatarThird,
        )}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote avatar URL
          <img
            src={avatarUrl}
            alt={username}
            className={styles.avatarImg}
          />
        ) : (
          initial
        )}
      </div>
      {emoji ? (
        <span
          className={size === "podium" ? styles.emoji : styles.rowEmoji}
          aria-label={`Status ${emoji}`}
          title={emoji}
        >
          {emoji}
        </span>
      ) : null}
    </div>
  );
}

function PodiumCard({
  entry,
  place,
  valueCaption,
  className,
}: {
  entry: LeaderboardBoardEntry;
  place: 1 | 2 | 3;
  valueCaption: string;
  className?: string;
}) {
  const tone = place === 1 ? "first" : place === 2 ? "second" : "third";
  const placeLabel = place === 1 ? "1st" : place === 2 ? "2nd" : "3rd";
  const placeClass =
    place === 1
      ? styles.placeFirst
      : place === 2
        ? styles.placeSecond
        : styles.placeThird;

  return (
    <div className={cn(styles.slot, className)}>
      <article
        className={cn(
          styles.card,
          place === 1 && styles.cardFirst,
          place === 2 && styles.cardSecond,
          place === 3 && styles.cardThird,
        )}
      >
        {place === 1 ? (
          <span className={styles.crown}>
            <Crown className="size-3.5" aria-hidden />
          </span>
        ) : null}
        <span className={cn(styles.placeTag, placeClass)}>
          <Medal className="size-2.5" aria-hidden />
          {placeLabel}
        </span>
        <PersonAvatar
          name={entry.name}
          username={entry.username}
          avatarUrl={entry.avatarUrl}
          emojiStatus={entry.emojiStatus}
          tone={tone}
          size="podium"
        />
        <p className={styles.handle}>@{entry.username}</p>
        <div className={styles.badges}>
          <LeaderboardTrustBadges
            isPremium={entry.isPremium}
            emailVerified={entry.emailVerified}
            isYou={entry.isViewer}
          />
        </div>
        <p className={styles.meta}>{entry.meta}</p>
        <p className={styles.metricLabel}>{valueCaption}</p>
        <p
          className={cn(
            styles.metricValue,
            place === 1 ? styles.metricPrimary : styles.metricSuccess,
          )}
        >
          {formatMoney(entry.value)}
        </p>
      </article>
      <div
        className={cn(
          styles.pedestal,
          place === 1 && styles.pedestalFirst,
          place === 2 && styles.pedestalSecond,
          place === 3 && styles.pedestalThird,
        )}
        aria-hidden
      >
        {place}
      </div>
    </div>
  );
}

function RankRow({ entry }: { entry: LeaderboardBoardEntry }) {
  return (
    <li className={cn(styles.row, entry.isViewer && styles.rowYou)}>
      <span className={styles.rankPill}>{entry.rank}</span>
      <PersonAvatar
        name={entry.name}
        username={entry.username}
        avatarUrl={entry.avatarUrl}
        emojiStatus={entry.emojiStatus}
        tone="row"
        size="row"
      />
      <div className={styles.rowBody}>
        <div className={styles.rowTop}>
          <p className={styles.rowHandle}>@{entry.username}</p>
          <LeaderboardTrustBadges
            isPremium={entry.isPremium}
            emailVerified={entry.emailVerified}
            isYou={entry.isViewer}
          />
        </div>
        <p className={styles.rowMeta}>{entry.meta}</p>
      </div>
      <p className={styles.rowValue}>{formatMoney(entry.value)}</p>
      <ChevronRight className={styles.chevron} aria-hidden />
    </li>
  );
}

function LeaderboardHero({
  title,
  description,
  stats,
  icon,
}: {
  title: string;
  description: string;
  stats: LeaderboardHeroStat[];
  icon?: ReactNode;
}) {
  return (
    <HubHeaderBar
      icon={icon ?? <Trophy />}
      title={title}
      description={description}
      stats={stats}
      statsLabel="Leaderboard summary"
      gradientTitle
    />
  );
}

export function LeaderboardBoard({
  title = "Leaderboard",
  description,
  listLabel,
  valueLabel,
  entries,
  outsider = null,
  heroStats = [],
  heroIcon,
  emptyTitle,
  emptyDescription,
  unrankedTitle = "Not ranked yet",
  unrankedDescription,
  showUnrankedAlert = false,
}: LeaderboardBoardProps) {
  const top3 = entries.filter((e) => e.rank <= 3).slice(0, 3);
  const rest = entries.filter((e) => e.rank > 3);
  const byPlace = {
    1: top3.find((e) => e.rank === 1) ?? null,
    2: top3.find((e) => e.rank === 2) ?? null,
    3: top3.find((e) => e.rank === 3) ?? null,
  };

  const defaultHeroStats: LeaderboardHeroStat[] =
    heroStats.length > 0
      ? heroStats
      : [
          {
            label: "Ranked",
            value: String(entries.length),
          },
          {
            label: "#1",
            value: byPlace[1] ? formatMoney(byPlace[1].value) : "—",
            tone: "success",
          },
        ];

  return (
    <>
      <LeaderboardHero
        title={title}
        description={description}
        stats={defaultHeroStats}
        icon={heroIcon}
      />

      {showUnrankedAlert ? (
          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle />
            <AlertTitle>{unrankedTitle}</AlertTitle>
            {unrankedDescription ? (
              <AlertDescription>{unrankedDescription}</AlertDescription>
            ) : null}
          </Alert>
        ) : null}

        {entries.length === 0 ? (
          <HubEmptyPanel>
            <EmptyState
              className="border-0 ring-0"
              icon={<Trophy className="size-6" />}
              title={emptyTitle}
              description={emptyDescription}
            />
          </HubEmptyPanel>
        ) : (
          <>
            {top3.length > 0 ? (
              <div className={styles.podium}>
                {byPlace[2] ? (
                  <PodiumCard
                    entry={byPlace[2]}
                    place={2}
                    valueCaption={valueLabel}
                    className={styles.slotSecond}
                  />
                ) : (
                  <div
                    className={cn(styles.slot, styles.slotSecond)}
                    aria-hidden
                  />
                )}
                {byPlace[1] ? (
                  <PodiumCard
                    entry={byPlace[1]}
                    place={1}
                    valueCaption={valueLabel}
                    className={styles.slotFirst}
                  />
                ) : (
                  <div
                    className={cn(styles.slot, styles.slotFirst)}
                    aria-hidden
                  />
                )}
                {byPlace[3] ? (
                  <PodiumCard
                    entry={byPlace[3]}
                    place={3}
                    valueCaption={valueLabel}
                    className={styles.slotThird}
                  />
                ) : (
                  <div
                    className={cn(styles.slot, styles.slotThird)}
                    aria-hidden
                  />
                )}
              </div>
            ) : null}

            {(rest.length > 0 || outsider) && (
              <section className={styles.listSection}>
                <div className={styles.listHead}>
                  <span>{listLabel}</span>
                  <span>{valueLabel}</span>
                </div>
                <ol className={styles.list}>
                  {rest.map((entry) => (
                    <RankRow key={entry.id} entry={entry} />
                  ))}
                </ol>
                {outsider ? (
                  <div className={styles.viewerNote}>
                    <p className={styles.viewerNoteLabel}>Your position</p>
                    <ol className={styles.list}>
                      <RankRow entry={outsider} />
                    </ol>
                  </div>
                ) : null}
              </section>
            )}
          </>
        )}
    </>
  );
}
