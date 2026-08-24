#ifndef DARKFIGHTER_TRACE_H
#define DARKFIGHTER_TRACE_H

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "gtia.h"
#include "pia.h"

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
	unsigned entity_y;
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
	DFTRACE_EVENT_ENTITY_DESPAWN = 1u << 9
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
static unsigned dftrace_pc_far_erase;
static unsigned dftrace_pc_hull;
static unsigned dftrace_pc_broadside;
static unsigned dftrace_pc_fighter_explosion;
static unsigned dftrace_pc_capital_explosion;
static unsigned dftrace_pc_music_tick;
static unsigned dftrace_pc_entity_spawn;
static unsigned dftrace_pc_entity_contact;
static unsigned dftrace_pc_entity_despawn;

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
static unsigned dftrace_entity_y;

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
	frame->entity_y = MEMORY_mem[dftrace_entity_y];
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
	fprintf(file, "session,frame,start_clock,end_clock,next_start_clock,wall_cycles,start_host_frame,end_host_frame,next_start_host_frame,start_scanline,start_cycle,end_scanline,end_cycle,host_vbi_boundaries,extra_vbi_boundaries,missed_frames,dli_nmis,dma_ctl,nmi_en,projectiles,broadside,far_rendered,live_raider,fighter_explosion,capital_explosion,music_active,fire_sfx,hit_sfx,capital_sfx,sound_enabled,player_lifecycle,sector_state,gameplay_frame,difficulty,active_muzzles,entity_active,entity_y,events\n");
	for (index = 0; index < dftrace_count; ++index) {
		DFTraceFrame *frame = &dftrace_frames[index];
		uint64_t wall = frame->end_clock - frame->start_clock;
		unsigned host_boundaries = frame->end_host_frame - frame->start_host_frame;
		unsigned cadence_frames = frame->next_start_host_frame - frame->start_host_frame;
		unsigned extra_boundaries = host_boundaries > 1 ? host_boundaries - 1 : 0;
		unsigned missed_frames = cadence_frames > 1 ? cadence_frames - 1 : 0;
		fprintf(file,
			"%s,%u,%llu,%llu,%llu,%llu,%u,%u,%u,%d,%d,%d,%d,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u\n",
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
			frame->entity_y, frame->events);
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
	DFTRACE_ADDRESS(dftrace_pc_far_erase, "DFTRACE_PC_FAR_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_hull, "DFTRACE_PC_HULL");
	DFTRACE_ADDRESS(dftrace_pc_broadside, "DFTRACE_PC_BROADSIDE");
	DFTRACE_ADDRESS(dftrace_pc_fighter_explosion, "DFTRACE_PC_FIGHTER_EXPLOSION");
	DFTRACE_ADDRESS(dftrace_pc_capital_explosion, "DFTRACE_PC_CAPITAL_EXPLOSION");
	DFTRACE_ADDRESS(dftrace_pc_music_tick, "DFTRACE_PC_MUSIC_TICK");
	DFTRACE_ADDRESS(dftrace_pc_entity_spawn, "DFTRACE_PC_ENTITY_SPAWN");
	DFTRACE_ADDRESS(dftrace_pc_entity_contact, "DFTRACE_PC_ENTITY_CONTACT");
	DFTRACE_ADDRESS(dftrace_pc_entity_despawn, "DFTRACE_PC_ENTITY_DESPAWN");
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
	DFTRACE_ADDRESS(dftrace_entity_y, "DFTRACE_ENTITY_Y");
#undef DFTRACE_ADDRESS
	dftrace_initialised = 1;
}

static void DFTrace_Observe(unsigned pc)
{
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
	else if (pc == dftrace_pc_far_erase)
		dftrace_current.events |= DFTRACE_EVENT_FAR_ERASE;
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

	if (pc == dftrace_pc_end) {
		dftrace_current.end_clock = dftrace_clock();
		dftrace_current.end_host_frame = (unsigned) Atari800_nframes;
		dftrace_current.end_y = ANTIC_ypos;
		dftrace_current.end_x = ANTIC_XPOS;
		dftrace_frames[dftrace_count++] = dftrace_current;
		dftrace_active = 0;
	}
}

#endif
