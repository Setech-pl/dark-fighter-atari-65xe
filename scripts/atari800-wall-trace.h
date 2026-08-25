#ifndef DARKFIGHTER_TRACE_H
#define DARKFIGHTER_TRACE_H

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "gtia.h"
#include "pia.h"
#include "screen.h"

#define DFTRACE_PAL_FRAME_CYCLES 35568u

typedef struct {
	uint64_t start_clock;
	uint64_t end_clock;
	uint64_t next_start_clock;
	unsigned start_host_frame;
	unsigned end_host_frame;
	unsigned next_start_host_frame;
	int start_y;
	int start_x;
	int end_y;
	int end_x;
	unsigned dli_nmis;
	unsigned events;
	unsigned dma_ctl;
	unsigned nmi_en;
	unsigned projectiles;
	unsigned broadside;
	unsigned far_rendered;
	unsigned live_raider;
	unsigned fighter_explosion;
	unsigned capital_explosion;
	unsigned music_active;
	unsigned fire_sfx;
	unsigned hit_sfx;
	unsigned capital_sfx;
	unsigned sound_enabled;
	unsigned player_lifecycle;
	unsigned sector_state;
	unsigned gameplay_frame;
	unsigned difficulty;
	unsigned active_muzzles;
	unsigned entity_active;
	unsigned entity_x;
	unsigned entity_y;
	unsigned entity_vx;
	unsigned entity_move_accumulator;
	unsigned entity_vertical_accumulator;
	unsigned entity_render_id;
	unsigned colbk;
	unsigned colpm0;
	unsigned colpm1;
	unsigned colpm2;
	unsigned colpm3;
	unsigned colpf0;
	unsigned colpf1;
	unsigned colpf2;
	unsigned colpf3;
	unsigned viper_explosion_timer;
	unsigned enemy_explosion_timer;
	unsigned effect_active_mask;
	unsigned effect_active_count;
	unsigned effect_rendered_mask;
} DFTraceFrame;

enum {
	DFTRACE_EVENT_WORLD = 1u << 0,
	DFTRACE_EVENT_FAR_ERASE = 1u << 1,
	DFTRACE_EVENT_HULL = 1u << 2,
	DFTRACE_EVENT_BROADSIDE = 1u << 3,
	DFTRACE_EVENT_FIGHTER_EXPLOSION = 1u << 4,
	DFTRACE_EVENT_CAPITAL_EXPLOSION = 1u << 5,
	DFTRACE_EVENT_MUSIC_TICK = 1u << 6,
	DFTRACE_EVENT_ENTITY_SPAWN = 1u << 7,
	DFTRACE_EVENT_ENTITY_CONTACT = 1u << 8,
	DFTRACE_EVENT_ENTITY_DESPAWN = 1u << 9,
	DFTRACE_EVENT_NEAR_STEP = 1u << 10,
	DFTRACE_EVENT_FAR_STEP = 1u << 11,
	DFTRACE_EVENT_ENTITY_SHOT = 1u << 12,
	DFTRACE_EVENT_EFFECT_SPAWN = 1u << 13,
	DFTRACE_EVENT_EFFECT_ERASE = 1u << 14,
	DFTRACE_EVENT_EFFECT_UPDATE = 1u << 15,
	DFTRACE_EVENT_EFFECT_RENDER = 1u << 16,
	DFTRACE_EVENT_RAIDER_BREAKUP_SPAWN = 1u << 17
};

static int dftrace_initialised;
static int dftrace_active;
static unsigned dftrace_count;
static unsigned dftrace_limit;
static unsigned dftrace_fire_delay;
static unsigned dftrace_difficulty;
static const char *dftrace_policy;
static const char *dftrace_session;
static const char *dftrace_output;
static DFTraceFrame *dftrace_frames;
static DFTraceFrame dftrace_current;

static unsigned dftrace_pc_active;
static unsigned dftrace_pc_end;
static unsigned dftrace_pc_frontend_poll;
static unsigned dftrace_pc_dli;
static unsigned dftrace_pc_world;
static unsigned dftrace_pc_near;
static unsigned dftrace_pc_far_erase;
static unsigned dftrace_pc_far_step;
static unsigned dftrace_pc_hull;
static unsigned dftrace_pc_broadside;
static unsigned dftrace_pc_fighter_explosion;
static unsigned dftrace_pc_capital_explosion;
static unsigned dftrace_pc_music_tick;
static unsigned dftrace_pc_entity_spawn;
static unsigned dftrace_pc_entity_contact;
static unsigned dftrace_pc_entity_despawn;
static unsigned dftrace_pc_entity_shot;
static unsigned dftrace_pc_effect_spawn;
static unsigned dftrace_pc_effect_erase;
static unsigned dftrace_pc_effect_update;
static unsigned dftrace_pc_effect_render;
static unsigned dftrace_pc_raider_breakup_spawn;

static unsigned dftrace_player_x;
static unsigned dftrace_player_y;
static unsigned dftrace_projectile_active;
static unsigned dftrace_broad_state;
static unsigned dftrace_far_active;
static unsigned dftrace_enemy_active;
static unsigned dftrace_fighter_explosion_timer;
static unsigned dftrace_capital_explosion_timer;
static unsigned dftrace_music_active;
static unsigned dftrace_fire_timer;
static unsigned dftrace_hit_timer;
static unsigned dftrace_capital_sound_timer;
static unsigned dftrace_sound_enabled;
static unsigned dftrace_player_lifecycle;
static unsigned dftrace_sector_state;
static unsigned dftrace_game_state;
static unsigned dftrace_frontend_selection;
static unsigned dftrace_frontend_input_armed;
static unsigned dftrace_difficulty_setting;
static unsigned dftrace_gameplay_frame;
static unsigned dftrace_muzzle_screen_hi;
static unsigned dftrace_entity_active_count;
static unsigned dftrace_entity_x;
static unsigned dftrace_entity_y;
static unsigned dftrace_entity_vx;
static unsigned dftrace_entity_move_accumulator;
static unsigned dftrace_entity_vertical_accumulator;
static unsigned dftrace_entity_render_id;
static unsigned dftrace_effect_active_mask;
static unsigned dftrace_effect_active_count;
static unsigned dftrace_effect_rendered_mask;

typedef struct {
	unsigned frame;
	unsigned pc;
	int scanline;
	int cycle;
	unsigned loader_timer;
	unsigned game_state;
	unsigned dlist;
	unsigned charset_address;
	unsigned pm_base;
	unsigned dma_ctl;
	unsigned nmi_en;
	unsigned vdslst;
	unsigned runad;
	unsigned initad;
	unsigned dosvec;
	unsigned screen_checksum;
	unsigned frontend_dlist_checksum;
} DFBootSnapshot;

static int dfboot_initialised;
static FILE *dfboot_file;
static const char *dfboot_artifact;
static const char *dfboot_screenshot_prefix;
static unsigned dfboot_fill;
static unsigned dfboot_last_frame = 0xffffffffu;
static unsigned dfboot_seen_start = 0xffffffffu;
static unsigned dfboot_seen_loader = 0xffffffffu;
static unsigned dfboot_seen_menu = 0xffffffffu;
static unsigned dfboot_seen_frontend = 0xffffffffu;
static unsigned dfboot_seen_gameplay = 0xffffffffu;
static unsigned dfboot_seen_main = 0xffffffffu;
static unsigned dfboot_pc_start;
static unsigned dfboot_pc_loader;
static unsigned dfboot_pc_menu;
static unsigned dfboot_pc_frontend;
static unsigned dfboot_pc_gameplay;
static unsigned dfboot_pc_main;
static unsigned dfboot_loader_timer;
static unsigned dfboot_game_state;
static unsigned dfboot_main_menu_dlist;
static unsigned dfboot_frontend_dlist_end;
static unsigned dfboot_snapshots_count;
static DFBootSnapshot dfboot_snapshots[5];

static unsigned dfboot_env_u(const char *name)
{
	const char *value = getenv(name);
	char *end;
	unsigned long parsed;
	if (value == NULL || *value == '\0') {
		fprintf(stderr, "darkfighter boot smoke: missing %s\n", name);
		exit(2);
	}
	parsed = strtoul(value, &end, 0);
	if (*end != '\0' || parsed > 0xffffu) {
		fprintf(stderr, "darkfighter boot smoke: invalid %s=%s\n", name, value);
		exit(2);
	}
	return (unsigned) parsed;
}

static unsigned dfboot_word(unsigned address)
{
	return MEMORY_mem[address] | ((unsigned) MEMORY_mem[address + 1u] << 8);
}

static unsigned dfboot_checksum(unsigned address, unsigned length)
{
	unsigned index;
	unsigned value = 0;
	for (index = 0; index < length; ++index)
		value = value * 33u + MEMORY_mem[(address + index) & 0xffffu];
	return value;
}

static int dfboot_target_frame(unsigned frame)
{
	return frame == 1u || frame == 250u || frame == 300u ||
		frame == 500u || frame == 750u;
}

static void dfboot_capture(unsigned frame, unsigned pc)
{
	DFBootSnapshot *snapshot;
	char screenshot[FILENAME_MAX];
	if (dfboot_snapshots_count >= 5u) {
		fprintf(stderr, "darkfighter boot smoke: too many target frames\n");
		exit(2);
	}
	snapshot = &dfboot_snapshots[dfboot_snapshots_count++];
	memset(snapshot, 0, sizeof(*snapshot));
	snapshot->frame = frame;
	snapshot->pc = pc;
	snapshot->scanline = ANTIC_ypos;
	snapshot->cycle = ANTIC_XPOS;
	snapshot->loader_timer = MEMORY_mem[dfboot_loader_timer];
	snapshot->game_state = MEMORY_mem[dfboot_game_state];
	snapshot->dlist = ANTIC_dlist;
	snapshot->charset_address = (unsigned) ANTIC_CHBASE << 8;
	snapshot->pm_base = (unsigned) ANTIC_PMBASE << 8;
	snapshot->dma_ctl = ANTIC_DMACTL;
	snapshot->nmi_en = ANTIC_NMIEN;
	snapshot->vdslst = dfboot_word(0x0200u);
	snapshot->runad = dfboot_word(0x02e0u);
	snapshot->initad = dfboot_word(0x02e2u);
	snapshot->dosvec = dfboot_word(0x000au);
	snapshot->screen_checksum = dfboot_checksum(0x4000u, 0x0400u);
	snapshot->frontend_dlist_checksum = dfboot_checksum(dfboot_main_menu_dlist,
		dfboot_frontend_dlist_end - dfboot_main_menu_dlist);
	if (dfboot_screenshot_prefix != NULL && *dfboot_screenshot_prefix != '\0') {
		snprintf(screenshot, sizeof(screenshot), "%s-frame%03u.png",
			dfboot_screenshot_prefix, frame);
		if (!Screen_SaveScreenshot(screenshot, 0)) {
			fprintf(stderr, "darkfighter boot smoke: screenshot failed: %s\n", screenshot);
			exit(2);
		}
	}
}

static void dfboot_write(void)
{
	unsigned index;
	fprintf(dfboot_file,
		"{\n  \"artifact\": \"%s\",\n  \"cold_ram_fill\": %u,\n  \"snapshots\": [\n",
		dfboot_artifact, dfboot_fill);
	for (index = 0; index < dfboot_snapshots_count; ++index) {
		DFBootSnapshot *snapshot = &dfboot_snapshots[index];
		fprintf(dfboot_file,
			"    {\"frame\":%u,\"pc\":%u,\"scanline\":%d,\"cycle\":%d,"
			"\"loader_timer\":%u,\"game_state\":%u,\"dlist\":%u,"
			"\"charset_address\":%u,\"pm_base\":%u,\"dma_ctl\":%u,"
			"\"nmi_en\":%u,\"vdslst\":%u,\"runad\":%u,\"initad\":%u,"
			"\"dosvec\":%u,\"screen_checksum\":%u,"
			"\"frontend_dlist_checksum\":%u}%s\n",
			snapshot->frame, snapshot->pc, snapshot->scanline, snapshot->cycle,
			snapshot->loader_timer, snapshot->game_state, snapshot->dlist,
			snapshot->charset_address, snapshot->pm_base, snapshot->dma_ctl,
			snapshot->nmi_en, snapshot->vdslst, snapshot->runad, snapshot->initad,
			snapshot->dosvec, snapshot->screen_checksum,
			snapshot->frontend_dlist_checksum,
			index + 1u == dfboot_snapshots_count ? "" : ",");
	}
	fprintf(dfboot_file,
		"  ],\n  \"milestones\": {\"start\":%u,\"loader\":%u,\"menu\":%u,"
		"\"frontend_poll\":%u,\"gameplay_init\":%u,\"main_loop\":%u}\n}\n",
		dfboot_seen_start, dfboot_seen_loader, dfboot_seen_menu,
		dfboot_seen_frontend, dfboot_seen_gameplay, dfboot_seen_main);
	if (fclose(dfboot_file) != 0) {
		perror("darkfighter boot smoke close");
		exit(2);
	}
}

static void dfboot_init(void)
{
	unsigned address;
	dfboot_artifact = getenv("DFBOOT_ARTIFACT");
	dfboot_screenshot_prefix = getenv("DFBOOT_SCREENSHOT_PREFIX");
	if (dfboot_artifact == NULL || *dfboot_artifact == '\0') {
		fprintf(stderr, "darkfighter boot smoke: missing DFBOOT_ARTIFACT\n");
		exit(2);
	}
	dfboot_file = fopen(getenv("DFBOOT_OUTPUT"), "w");
	if (dfboot_file == NULL) {
		perror("darkfighter boot smoke output");
		exit(2);
	}
	dfboot_fill = dfboot_env_u("DFBOOT_RAM_FILL");
	if (dfboot_fill > 0xffu) {
		fprintf(stderr, "darkfighter boot smoke: RAM fill exceeds one byte\n");
		exit(2);
	}
	for (address = 0x8000u; address < 0xa000u; ++address)
		MEMORY_mem[address] = (UBYTE) dfboot_fill;
	dfboot_pc_start = dfboot_env_u("DFBOOT_PC_START");
	dfboot_pc_loader = dfboot_env_u("DFBOOT_PC_LOADER");
	dfboot_pc_menu = dfboot_env_u("DFBOOT_PC_MENU");
	dfboot_pc_frontend = dfboot_env_u("DFBOOT_PC_FRONTEND");
	dfboot_pc_gameplay = dfboot_env_u("DFBOOT_PC_GAMEPLAY");
	dfboot_pc_main = dfboot_env_u("DFBOOT_PC_MAIN");
	dfboot_loader_timer = dfboot_env_u("DFBOOT_LOADER_TIMER");
	dfboot_game_state = dfboot_env_u("DFBOOT_GAME_STATE");
	dfboot_main_menu_dlist = dfboot_env_u("DFBOOT_MAIN_MENU_DLIST");
	dfboot_frontend_dlist_end = dfboot_env_u("DFBOOT_FRONTEND_DLIST_END");
	dfboot_initialised = 1;
}

static void dfboot_observe(unsigned pc)
{
	unsigned frame;
	if (!dfboot_initialised)
		dfboot_init();
	frame = (unsigned) Atari800_nframes;
	if (pc == dfboot_pc_start && dfboot_seen_start == 0xffffffffu)
		dfboot_seen_start = frame;
	if (pc == dfboot_pc_loader && dfboot_seen_loader == 0xffffffffu)
		dfboot_seen_loader = frame;
	if (pc == dfboot_pc_menu && dfboot_seen_menu == 0xffffffffu)
		dfboot_seen_menu = frame;
	if (pc == dfboot_pc_frontend && dfboot_seen_frontend == 0xffffffffu)
		dfboot_seen_frontend = frame;
	if (pc == dfboot_pc_gameplay && dfboot_seen_gameplay == 0xffffffffu)
		dfboot_seen_gameplay = frame;
	if (pc == dfboot_pc_main && dfboot_seen_main == 0xffffffffu)
		dfboot_seen_main = frame;

	/* Drive the production menu input path: neutral through the loader/menu,
	 * then a short FIRE press after the frame-500 proof snapshot. */
	PIA_PORT_input[0] = (PIA_PORT_input[0] & 0xf0u) | 0x0fu;
	GTIA_TRIG[0] = (UBYTE) (frame >= 501u && frame <= 506u ? 0 : 1);
	if (frame != dfboot_last_frame) {
		dfboot_last_frame = frame;
		if (dfboot_target_frame(frame))
			dfboot_capture(frame, pc);
		if (frame > 750u) {
			dfboot_write();
			fflush(NULL);
			exit(0);
		}
	}
}

static unsigned dftrace_env_u(const char *name)
{
	const char *value = getenv(name);
	char *end;
	unsigned long parsed;
	if (value == NULL || *value == '\0') {
		fprintf(stderr, "darkfighter trace: missing %s\n", name);
		exit(2);
	}
	parsed = strtoul(value, &end, 0);
	if (*end != '\0' || parsed > 0xffffu) {
		fprintf(stderr, "darkfighter trace: invalid %s=%s\n", name, value);
		exit(2);
	}
	return (unsigned) parsed;
}

static unsigned dftrace_count_nonzero(unsigned address, unsigned length)
{
	unsigned index;
	unsigned count = 0;
	for (index = 0; index < length; ++index)
		if (MEMORY_mem[(address + index) & 0xffffu] != 0)
			++count;
	return count;
}

static unsigned dftrace_count_far_rendered(void)
{
	unsigned index;
	unsigned count = 0;
	for (index = 0; index < 24; ++index)
		if ((MEMORY_mem[dftrace_far_active + index] & 0x80u) != 0)
			++count;
	return count;
}

static void dftrace_set_input(unsigned stick, unsigned trigger)
{
	PIA_PORT_input[0] = (PIA_PORT_input[0] & 0xf0u) | (stick & 0x0fu);
	GTIA_TRIG[0] = (UBYTE) (trigger != 0);
}

static void dftrace_set_gameplay_input(unsigned frame)
{
	unsigned stick = 0x0f;
	unsigned trigger = frame <= dftrace_fire_delay ? 1 : 0;
	unsigned x = MEMORY_mem[dftrace_player_x];
	unsigned y = MEMORY_mem[dftrace_player_y];
	if (strcmp(dftrace_policy, "sweep") == 0) {
		int target_right = ((frame / 72u) & 1u) == 0;
		stick = target_right ? (x < 154u ? 0x07u : 0x0fu) :
			(x > 94u ? 0x0bu : 0x0fu);
	}
	else if (strcmp(dftrace_policy, "evasive") == 0) {
		int target_right = ((frame / 48u) & 1u) == 0;
		stick = target_right ? (x < 150u ? 0x07u : 0x0fu) :
			(x > 98u ? 0x0bu : 0x0fu);
		if (frame % 128u < 48u && y > 142u)
			stick &= 0x0eu;
		else if (frame % 128u >= 80u && y < 184u)
			stick &= 0x0du;
	}
	dftrace_set_input(stick, trigger);
}

static void dftrace_set_frontend_input(void)
{
	unsigned state = MEMORY_mem[dftrace_game_state];
	unsigned selection = MEMORY_mem[dftrace_frontend_selection];
	unsigned armed = MEMORY_mem[dftrace_frontend_input_armed];
	unsigned difficulty = MEMORY_mem[dftrace_difficulty_setting];
	unsigned stick = 0x0f;
	unsigned trigger = 1;

	/* Use the production release/arm/dispatch gate and the real menu/options
	 * handlers. No gameplay state is seeded directly by the tracer. */
	if (armed != 0) {
		if (state == 1) {
			if (difficulty == dftrace_difficulty) {
				if (selection == 0)
					trigger = 0;
				else
					stick = 0x0e; /* UP */
			}
			else if (selection < 1)
				stick = 0x0d; /* DOWN to OPTIONS */
			else if (selection > 1)
				stick = 0x0e;
			else
				trigger = 0;
		}
		else if (state == 2) {
			if (difficulty != dftrace_difficulty) {
				if (selection < 2)
					stick = 0x0d;
				else if (selection > 2)
					stick = 0x0e;
				else
					stick = difficulty < dftrace_difficulty ? 0x07 : 0x0b;
			}
			else if (selection < 3)
				stick = 0x0d; /* BACK */
			else if (selection > 3)
				stick = 0x0e;
			else
				trigger = 0;
		}
		else if (state == 7)
			trigger = 0; /* GAME OVER -> production return to main menu */
	}
	dftrace_set_input(stick, trigger);
}

static uint64_t dftrace_clock(void)
{
	return (uint64_t) ANTIC_CPU_CLOCK;
}

static void dftrace_snapshot(DFTraceFrame *frame)
{
	frame->dma_ctl = ANTIC_DMACTL;
	frame->nmi_en = ANTIC_NMIEN;
	frame->projectiles = dftrace_count_nonzero(dftrace_projectile_active, 19);
	frame->broadside = dftrace_count_nonzero(dftrace_broad_state, 3);
	frame->far_rendered = dftrace_count_far_rendered();
	frame->live_raider = MEMORY_mem[dftrace_enemy_active] == 1;
	frame->fighter_explosion = dftrace_count_nonzero(dftrace_fighter_explosion_timer, 2);
	frame->capital_explosion = dftrace_count_nonzero(dftrace_capital_explosion_timer, 2);
	frame->music_active = MEMORY_mem[dftrace_music_active] != 0;
	frame->fire_sfx = MEMORY_mem[dftrace_fire_timer] != 0;
	frame->hit_sfx = MEMORY_mem[dftrace_hit_timer] != 0;
	frame->capital_sfx = MEMORY_mem[dftrace_capital_sound_timer] != 0;
	frame->sound_enabled = MEMORY_mem[dftrace_sound_enabled] != 0;
	frame->player_lifecycle = MEMORY_mem[dftrace_player_lifecycle];
	frame->sector_state = MEMORY_mem[dftrace_sector_state];
	frame->gameplay_frame = MEMORY_mem[dftrace_gameplay_frame];
	frame->difficulty = MEMORY_mem[dftrace_difficulty_setting];
	frame->active_muzzles = dftrace_count_nonzero(dftrace_muzzle_screen_hi, 2);
	frame->entity_active = MEMORY_mem[dftrace_entity_active_count];
	frame->entity_x = MEMORY_mem[dftrace_entity_x];
	frame->entity_y = MEMORY_mem[dftrace_entity_y];
	frame->entity_vx = MEMORY_mem[dftrace_entity_vx];
	frame->entity_move_accumulator = MEMORY_mem[dftrace_entity_move_accumulator];
	frame->entity_vertical_accumulator = MEMORY_mem[dftrace_entity_vertical_accumulator];
	frame->entity_render_id = MEMORY_mem[dftrace_entity_render_id];
}

static void dftrace_snapshot_flash(DFTraceFrame *frame)
{
	frame->colbk = GTIA_COLBK;
	frame->colpm0 = GTIA_COLPM0;
	frame->colpm1 = GTIA_COLPM1;
	frame->colpm2 = GTIA_COLPM2;
	frame->colpm3 = GTIA_COLPM3;
	frame->colpf0 = GTIA_COLPF0;
	frame->colpf1 = GTIA_COLPF1;
	frame->colpf2 = GTIA_COLPF2;
	frame->colpf3 = GTIA_COLPF3;
	frame->viper_explosion_timer = MEMORY_mem[dftrace_fighter_explosion_timer];
	frame->enemy_explosion_timer = MEMORY_mem[dftrace_fighter_explosion_timer + 1u];
	frame->effect_active_mask = MEMORY_mem[dftrace_effect_active_mask];
	frame->effect_active_count = MEMORY_mem[dftrace_effect_active_count];
	frame->effect_rendered_mask = MEMORY_mem[dftrace_effect_rendered_mask];
}

static void dftrace_write(void)
{
	FILE *file;
	unsigned index;
	file = fopen(dftrace_output, "w");
	if (file == NULL) {
		perror("darkfighter trace output");
		exit(2);
	}
	fprintf(file, "session,frame,start_clock,end_clock,next_start_clock,wall_cycles,start_host_frame,end_host_frame,next_start_host_frame,start_scanline,start_cycle,end_scanline,end_cycle,host_vbi_boundaries,extra_vbi_boundaries,missed_frames,dli_nmis,dma_ctl,nmi_en,projectiles,broadside,far_rendered,live_raider,fighter_explosion,capital_explosion,music_active,fire_sfx,hit_sfx,capital_sfx,sound_enabled,player_lifecycle,sector_state,gameplay_frame,difficulty,active_muzzles,entity_active,entity_x,entity_y,entity_vx,entity_move_accumulator,entity_vertical_accumulator,entity_render_id,colbk,colpm0,colpm1,colpm2,colpm3,colpf0,colpf1,colpf2,colpf3,viper_explosion_timer,enemy_explosion_timer,events,effect_active_mask,effect_active_count,effect_rendered_mask\n");
	for (index = 0; index < dftrace_count; ++index) {
		DFTraceFrame *frame = &dftrace_frames[index];
		uint64_t wall = frame->end_clock - frame->start_clock;
		unsigned host_boundaries = frame->end_host_frame - frame->start_host_frame;
		unsigned cadence_frames = frame->next_start_host_frame - frame->start_host_frame;
		unsigned extra_boundaries = host_boundaries > 1 ? host_boundaries - 1 : 0;
		unsigned missed_frames = cadence_frames > 1 ? cadence_frames - 1 : 0;
		fprintf(file,
			"%s,%u,%llu,%llu,%llu,%llu,%u,%u,%u,%d,%d,%d,%d,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u\n",
			dftrace_session, index,
			(unsigned long long) frame->start_clock,
			(unsigned long long) frame->end_clock,
			(unsigned long long) frame->next_start_clock,
			(unsigned long long) wall,
			frame->start_host_frame, frame->end_host_frame, frame->next_start_host_frame,
			frame->start_y, frame->start_x, frame->end_y, frame->end_x,
			host_boundaries, extra_boundaries, missed_frames, frame->dli_nmis,
			frame->dma_ctl, frame->nmi_en, frame->projectiles, frame->broadside,
			frame->far_rendered, frame->live_raider, frame->fighter_explosion,
			frame->capital_explosion, frame->music_active, frame->fire_sfx,
			frame->hit_sfx, frame->capital_sfx, frame->sound_enabled,
			frame->player_lifecycle, frame->sector_state, frame->gameplay_frame,
			frame->difficulty, frame->active_muzzles, frame->entity_active,
			frame->entity_x, frame->entity_y, frame->entity_vx,
			frame->entity_move_accumulator, frame->entity_vertical_accumulator,
			frame->entity_render_id, frame->colbk, frame->colpm0, frame->colpm1,
			frame->colpm2, frame->colpm3, frame->colpf0, frame->colpf1,
			frame->colpf2, frame->colpf3, frame->viper_explosion_timer,
			frame->enemy_explosion_timer, frame->events, frame->effect_active_mask,
			frame->effect_active_count, frame->effect_rendered_mask);
	}
	if (fclose(file) != 0) {
		perror("darkfighter trace close");
		exit(2);
	}
}

static void dftrace_init(void)
{
	dftrace_limit = dftrace_env_u("DFTRACE_FRAMES");
	dftrace_fire_delay = dftrace_env_u("DFTRACE_FIRE_DELAY");
	dftrace_difficulty = dftrace_env_u("DFTRACE_DIFFICULTY");
	if (dftrace_difficulty > 2) {
		fprintf(stderr, "darkfighter trace: invalid difficulty %u\n", dftrace_difficulty);
		exit(2);
	}
	dftrace_policy = getenv("DFTRACE_POLICY");
	dftrace_session = getenv("DFTRACE_SESSION");
	dftrace_output = getenv("DFTRACE_OUTPUT");
	if (dftrace_policy == NULL || dftrace_session == NULL || dftrace_output == NULL) {
		fprintf(stderr, "darkfighter trace: missing string environment\n");
		exit(2);
	}
	dftrace_frames = (DFTraceFrame *) calloc(dftrace_limit, sizeof(*dftrace_frames));
	if (dftrace_frames == NULL) {
		fprintf(stderr, "darkfighter trace: allocation failed\n");
		exit(2);
	}
#define DFTRACE_ADDRESS(field, env) field = dftrace_env_u(env)
	DFTRACE_ADDRESS(dftrace_pc_active, "DFTRACE_PC_ACTIVE");
	DFTRACE_ADDRESS(dftrace_pc_end, "DFTRACE_PC_END");
	DFTRACE_ADDRESS(dftrace_pc_frontend_poll, "DFTRACE_PC_FRONTEND_POLL");
	DFTRACE_ADDRESS(dftrace_pc_dli, "DFTRACE_PC_DLI");
	DFTRACE_ADDRESS(dftrace_pc_world, "DFTRACE_PC_WORLD");
	DFTRACE_ADDRESS(dftrace_pc_near, "DFTRACE_PC_NEAR");
	DFTRACE_ADDRESS(dftrace_pc_far_erase, "DFTRACE_PC_FAR_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_far_step, "DFTRACE_PC_FAR_STEP");
	DFTRACE_ADDRESS(dftrace_pc_hull, "DFTRACE_PC_HULL");
	DFTRACE_ADDRESS(dftrace_pc_broadside, "DFTRACE_PC_BROADSIDE");
	DFTRACE_ADDRESS(dftrace_pc_fighter_explosion, "DFTRACE_PC_FIGHTER_EXPLOSION");
	DFTRACE_ADDRESS(dftrace_pc_capital_explosion, "DFTRACE_PC_CAPITAL_EXPLOSION");
	DFTRACE_ADDRESS(dftrace_pc_music_tick, "DFTRACE_PC_MUSIC_TICK");
	DFTRACE_ADDRESS(dftrace_pc_entity_spawn, "DFTRACE_PC_ENTITY_SPAWN");
	DFTRACE_ADDRESS(dftrace_pc_entity_contact, "DFTRACE_PC_ENTITY_CONTACT");
	DFTRACE_ADDRESS(dftrace_pc_entity_despawn, "DFTRACE_PC_ENTITY_DESPAWN");
	DFTRACE_ADDRESS(dftrace_pc_entity_shot, "DFTRACE_PC_ENTITY_SHOT");
	DFTRACE_ADDRESS(dftrace_pc_effect_spawn, "DFTRACE_PC_EFFECT_SPAWN");
	DFTRACE_ADDRESS(dftrace_pc_effect_erase, "DFTRACE_PC_EFFECT_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_effect_update, "DFTRACE_PC_EFFECT_UPDATE");
	DFTRACE_ADDRESS(dftrace_pc_effect_render, "DFTRACE_PC_EFFECT_RENDER");
	DFTRACE_ADDRESS(dftrace_pc_raider_breakup_spawn, "DFTRACE_PC_RAIDER_BREAKUP_SPAWN");
	DFTRACE_ADDRESS(dftrace_player_x, "DFTRACE_PLAYER_X");
	DFTRACE_ADDRESS(dftrace_player_y, "DFTRACE_PLAYER_Y");
	DFTRACE_ADDRESS(dftrace_projectile_active, "DFTRACE_PROJECTILE_ACTIVE");
	DFTRACE_ADDRESS(dftrace_broad_state, "DFTRACE_BROAD_STATE");
	DFTRACE_ADDRESS(dftrace_far_active, "DFTRACE_FAR_ACTIVE");
	DFTRACE_ADDRESS(dftrace_enemy_active, "DFTRACE_ENEMY_ACTIVE");
	DFTRACE_ADDRESS(dftrace_fighter_explosion_timer, "DFTRACE_FIGHTER_EXPLOSION_TIMER");
	DFTRACE_ADDRESS(dftrace_capital_explosion_timer, "DFTRACE_CAPITAL_EXPLOSION_TIMER");
	DFTRACE_ADDRESS(dftrace_music_active, "DFTRACE_MUSIC_ACTIVE");
	DFTRACE_ADDRESS(dftrace_fire_timer, "DFTRACE_FIRE_TIMER");
	DFTRACE_ADDRESS(dftrace_hit_timer, "DFTRACE_HIT_TIMER");
	DFTRACE_ADDRESS(dftrace_capital_sound_timer, "DFTRACE_CAPITAL_SOUND_TIMER");
	DFTRACE_ADDRESS(dftrace_sound_enabled, "DFTRACE_SOUND_ENABLED");
	DFTRACE_ADDRESS(dftrace_player_lifecycle, "DFTRACE_PLAYER_LIFECYCLE");
	DFTRACE_ADDRESS(dftrace_sector_state, "DFTRACE_SECTOR_STATE");
	DFTRACE_ADDRESS(dftrace_game_state, "DFTRACE_GAME_STATE");
	DFTRACE_ADDRESS(dftrace_frontend_selection, "DFTRACE_FRONTEND_SELECTION");
	DFTRACE_ADDRESS(dftrace_frontend_input_armed, "DFTRACE_FRONTEND_INPUT_ARMED");
	DFTRACE_ADDRESS(dftrace_difficulty_setting, "DFTRACE_DIFFICULTY_SETTING");
	DFTRACE_ADDRESS(dftrace_gameplay_frame, "DFTRACE_GAMEPLAY_FRAME");
	DFTRACE_ADDRESS(dftrace_muzzle_screen_hi, "DFTRACE_MUZZLE_SCREEN_HI");
	DFTRACE_ADDRESS(dftrace_entity_active_count, "DFTRACE_ENTITY_ACTIVE_COUNT");
	DFTRACE_ADDRESS(dftrace_entity_x, "DFTRACE_ENTITY_X");
	DFTRACE_ADDRESS(dftrace_entity_y, "DFTRACE_ENTITY_Y");
	DFTRACE_ADDRESS(dftrace_entity_vx, "DFTRACE_ENTITY_VX");
	DFTRACE_ADDRESS(dftrace_entity_move_accumulator, "DFTRACE_ENTITY_MOVE_ACCUMULATOR");
	DFTRACE_ADDRESS(dftrace_entity_vertical_accumulator, "DFTRACE_ENTITY_VERTICAL_ACCUMULATOR");
	DFTRACE_ADDRESS(dftrace_entity_render_id, "DFTRACE_ENTITY_RENDER_ID");
	DFTRACE_ADDRESS(dftrace_effect_active_mask, "DFTRACE_EFFECT_ACTIVE_MASK");
	DFTRACE_ADDRESS(dftrace_effect_active_count, "DFTRACE_EFFECT_ACTIVE_COUNT");
	DFTRACE_ADDRESS(dftrace_effect_rendered_mask, "DFTRACE_EFFECT_RENDERED_MASK");
#undef DFTRACE_ADDRESS
	dftrace_initialised = 1;
}

static void DFTrace_Observe(unsigned pc)
{
	if (getenv("DFBOOT_OUTPUT") != NULL) {
		dfboot_observe(pc);
		return;
	}
	if (!dftrace_initialised)
		dftrace_init();

	if (!dftrace_active && pc == dftrace_pc_frontend_poll) {
		dftrace_set_frontend_input();
	}

	if (pc == dftrace_pc_active && !dftrace_active) {
		if (dftrace_count != 0) {
			DFTraceFrame *previous = &dftrace_frames[dftrace_count - 1];
			previous->next_start_clock = dftrace_clock();
			previous->next_start_host_frame = (unsigned) Atari800_nframes;
		}
		if (dftrace_count == dftrace_limit) {
			dftrace_write();
			fflush(NULL);
			exit(0);
		}
		if (MEMORY_mem[dftrace_difficulty_setting] != dftrace_difficulty) {
			fprintf(stderr, "darkfighter trace: production frontend selected difficulty %u, expected %u\n",
				MEMORY_mem[dftrace_difficulty_setting], dftrace_difficulty);
			exit(2);
		}
		memset(&dftrace_current, 0, sizeof(dftrace_current));
		dftrace_active = 1;
		dftrace_set_gameplay_input(dftrace_count);
		dftrace_current.start_clock = dftrace_clock();
		dftrace_current.start_host_frame = (unsigned) Atari800_nframes;
		dftrace_current.start_y = ANTIC_ypos;
		dftrace_current.start_x = ANTIC_XPOS;
		dftrace_snapshot(&dftrace_current);
		return;
	}

	if (!dftrace_active)
		return;

	if (pc == dftrace_pc_dli)
		++dftrace_current.dli_nmis;
	if (pc == dftrace_pc_world)
		dftrace_current.events |= DFTRACE_EVENT_WORLD;
	else if (pc == dftrace_pc_near)
		dftrace_current.events |= DFTRACE_EVENT_NEAR_STEP;
	else if (pc == dftrace_pc_far_erase)
		dftrace_current.events |= DFTRACE_EVENT_FAR_ERASE;
	else if (pc == dftrace_pc_far_step)
		dftrace_current.events |= DFTRACE_EVENT_FAR_STEP;
	else if (pc == dftrace_pc_hull)
		dftrace_current.events |= DFTRACE_EVENT_HULL;
	else if (pc == dftrace_pc_broadside)
		dftrace_current.events |= DFTRACE_EVENT_BROADSIDE;
	else if (pc == dftrace_pc_fighter_explosion)
		dftrace_current.events |= DFTRACE_EVENT_FIGHTER_EXPLOSION;
	else if (pc == dftrace_pc_capital_explosion)
		dftrace_current.events |= DFTRACE_EVENT_CAPITAL_EXPLOSION;
	else if (pc == dftrace_pc_music_tick)
		dftrace_current.events |= DFTRACE_EVENT_MUSIC_TICK;
	else if (pc == dftrace_pc_entity_spawn)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_SPAWN;
	else if (pc == dftrace_pc_entity_contact)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_CONTACT;
	else if (pc == dftrace_pc_entity_despawn)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_DESPAWN;
	else if (pc == dftrace_pc_entity_shot)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_SHOT;
	else if (pc == dftrace_pc_effect_spawn)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_SPAWN;
	else if (pc == dftrace_pc_effect_erase)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_ERASE;
	else if (pc == dftrace_pc_effect_update)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_UPDATE;
	else if (pc == dftrace_pc_effect_render)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_RENDER;
	else if (pc == dftrace_pc_raider_breakup_spawn)
		dftrace_current.events |= DFTRACE_EVENT_RAIDER_BREAKUP_SPAWN;

	if (pc == dftrace_pc_end) {
		dftrace_snapshot_flash(&dftrace_current);
		dftrace_current.end_clock = dftrace_clock();
		dftrace_current.end_host_frame = (unsigned) Atari800_nframes;
		dftrace_current.end_y = ANTIC_ypos;
		dftrace_current.end_x = ANTIC_XPOS;
		dftrace_frames[dftrace_count++] = dftrace_current;
		dftrace_active = 0;
	}
}

#endif
