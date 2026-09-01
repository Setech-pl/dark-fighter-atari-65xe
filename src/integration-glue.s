.setcpu "6502"
PLAYER_LIFECYCLE = $4EAA
ENTITY_SPAWN_TIMER_LO = $8003
PLAYER_DYING = 1
PLAYER_GAME_OVER = 3
DIRECTOR_WORLD_ROW_TICK = $9D9B
DIRECTOR_REQUEST = $9EA7
DIRECTOR_RELEASE = $9F23
DIRECTOR_HAZARD_DEBRIS = 1
ENTITY_REPEAT_SPAWN_DELAY = 64
entity_spawn_debris = $98E4
entity_despawn_debris = $99F8
.segment "GLUE"
.export integration_director_world_row, integration_debris_spawn, integration_debris_release
integration_director_world_row:
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_DYING
    beq @frozen
    cmp #PLAYER_GAME_OVER
    beq @frozen
    jmp DIRECTOR_WORLD_ROW_TICK
@frozen:
    rts
integration_debris_spawn:
    ldx #DIRECTOR_HAZARD_DEBRIS
    jsr DIRECTOR_REQUEST
    bcs @spawn
    lda #ENTITY_REPEAT_SPAWN_DELAY
    sta ENTITY_SPAWN_TIMER_LO
    rts
@spawn:
    jmp entity_spawn_debris
integration_debris_release:
    ldx #DIRECTOR_HAZARD_DEBRIS
    jsr DIRECTOR_RELEASE
    jmp entity_despawn_debris
