.setcpu "6502"

; Dark Fighter 0.1 vertical slice
; Target: stock Atari 65XE PAL, 64 KB

.export start
.export boot_return

; -----------------------------------------------------------------------------
; OS workspace and vectors

DOSVEC      = $000A
APPMHI      = $0014
MEMLO       = $02E7

; -----------------------------------------------------------------------------
; GTIA (write/read aliases share addresses)

HPOSP0      = $D000
HPOSP1      = $D001
HPOSP2      = $D002
HPOSP3      = $D003
HPOSM0      = $D004
SIZEP0      = $D008
SIZEP1      = $D009
SIZEP2      = $D00A
SIZEP3      = $D00B
SIZEM       = $D00C
M0PL        = $D008
P0PL        = $D00C
TRIG0       = $D010
COLPM0      = $D012
COLPM1      = $D013
COLPM2      = $D014
COLPM3      = $D015
COLPF1      = $D017
COLPF2      = $D018
COLBK       = $D01A
PRIOR       = $D01B
GRACTL      = $D01D
HITCLR      = $D01E

; -----------------------------------------------------------------------------
; POKEY

AUDF1       = $D200
AUDC1       = $D201
AUDF2       = $D202
AUDC2       = $D203
AUDF3       = $D204
AUDC3       = $D205
AUDCTL      = $D208

; -----------------------------------------------------------------------------
; PIA and ANTIC

STICK0      = $D300
DMACTL      = $D400
DLISTL      = $D402
DLISTH      = $D403
PMBASE      = $D407
VCOUNT      = $D40B
NMIEN       = $D40E

; -----------------------------------------------------------------------------
; Reserved RAM

PMG_BASE    = $3800
MISSILES    = PMG_BASE + $0300
PLAYER0     = PMG_BASE + $0400
PLAYER1     = PMG_BASE + $0500
PLAYER2     = PMG_BASE + $0600
PLAYER3     = PMG_BASE + $0700
SCREEN      = $4000

PLAYER_H    = 16
ENEMY_H     = 12
PLAYER_X_MIN = 48
PLAYER_X_MAX = 208
PLAYER_Y_MIN = 64
PLAYER_Y_MAX = 208

; Atari screen-code values for the OS character set.
CH_SPACE    = 0
CH_STAR     = 10
CH_DASH     = 13
CH_DOT      = 14
CH_ZERO     = 16

.segment "ZEROPAGE"

player_x:           .res 1
player_y:           .res 1
enemy_x:            .res 1
enemy_y:            .res 1
enemy_direction:    .res 1
bullet_x:           .res 1
bullet_y:           .res 1
bullet_active:      .res 1
scanner_phase:      .res 1
frame_counter:      .res 1
scroll_timer:       .res 1
fire_timer:         .res 1
hit_timer:          .res 1
damage_timer:       .res 1
rng_state:          .res 1
score_bcd_lo:       .res 1
score_bcd_hi:       .res 1
row_counter:        .res 1
stick_value:        .res 1
src_ptr:            .res 2
dst_ptr:            .res 2

.segment "CODE"

; The first six bytes are interpreted by the Atari OS disk boot routine.
; Byte 1 (sector count) is patched by scripts/build.mjs after linking.
boot_header:
    .byte $00
    .byte $00
    .word $2000
    .word boot_return

; The OS enters at BOOTAD+6 after loading the consecutive boot sectors.
boot_entry:
    lda #<$3000
    sta MEMLO
    sta APPMHI
    lda #>$3000
    sta MEMLO+1
    sta APPMHI+1

    lda #<start
    sta DOSVEC
    lda #>start
    sta DOSVEC+1

    clc
boot_return:
    rts

; XEX builds use RUNAD=start. Disk boot reaches start through DOSVEC.
start:
    sei

    lda #$00
    sta NMIEN
    sta DMACTL
    sta GRACTL
    sta AUDCTL

    jsr clear_pmg
    jsr clear_screen
    jsr init_state
    jsr init_screen
    jsr draw_player
    jsr draw_enemy
    jsr update_score_display

    lda #<display_list
    sta DLISTL
    lda #>display_list
    sta DLISTH

    lda #>PMG_BASE
    sta PMBASE

    lda #$00
    sta SIZEP0
    sta SIZEP1
    sta SIZEP2
    sta SIZEP3
    sta SIZEM
    sta PRIOR

    lda #$0E                    ; cold white player hull
    sta COLPM0
    lda #$08                    ; dark steel enemy hull
    sta COLPM1
    lda #$46                    ; hostile red scanner
    sta COLPM2
    lda #$28                    ; amber engine plume
    sta COLPM3
    lda #$0C                    ; text/stars
    sta COLPF1
    lda #$02                    ; near-black playfield
    sta COLPF2
    lda #$00
    sta COLBK

    lda #$03                    ; enable players and missiles
    sta GRACTL
    lda #$3E                    ; normal playfield, single-line PMG DMA
    sta DMACTL
    sta HITCLR

    lda #$68                    ; quiet, continuous engine bed
    sta AUDF3
    lda #$22
    sta AUDC3

main_loop:
    jsr wait_frame
    inc frame_counter

    jsr read_input
    jsr update_bullet
    jsr update_enemy
    jsr handle_collisions
    jsr update_starfield
    jsr update_sound

    jmp main_loop

; -----------------------------------------------------------------------------
; Frame and initialization

wait_frame:
    lda #$70
@wait_for_line:
    cmp VCOUNT
    bne @wait_for_line
@leave_line:
    lda VCOUNT
    cmp #$70
    beq @leave_line
    rts

init_state:
    lda #$80
    sta player_x
    lda #$B8
    sta player_y

    lda #$78
    sta enemy_x
    lda #$38
    sta enemy_y

    lda #$01
    sta enemy_direction
    lda #$A7
    sta rng_state

    lda #$00
    sta bullet_active
    sta scanner_phase
    sta frame_counter
    sta fire_timer
    sta hit_timer
    sta damage_timer
    sta score_bcd_lo
    sta score_bcd_hi

    lda #$04
    sta scroll_timer
    rts

clear_pmg:
    lda #$00
    ldx #$00
@loop:
    sta PMG_BASE+$000,x
    sta PMG_BASE+$100,x
    sta PMG_BASE+$200,x
    sta PMG_BASE+$300,x
    sta PMG_BASE+$400,x
    sta PMG_BASE+$500,x
    sta PMG_BASE+$600,x
    sta PMG_BASE+$700,x
    inx
    bne @loop
    rts

clear_screen:
    lda #CH_SPACE
    ldx #$00
@loop:
    sta SCREEN+$000,x
    sta SCREEN+$100,x
    sta SCREEN+$200,x
    sta SCREEN+$300,x
    inx
    bne @loop
    rts

init_screen:
    ldx #$00
@title_loop:
    lda hud_ascii,x
    beq @title_done
    sec
    sbc #$20
    sta SCREEN,x
    inx
    bne @title_loop
@title_done:
    lda #CH_DASH
    ldx #39
@divider:
    sta SCREEN+40,x
    dex
    bpl @divider

    lda #<(SCREEN+80)
    sta dst_ptr
    lda #>(SCREEN+80)
    sta dst_ptr+1
    lda #22
    sta row_counter
@star_rows:
    jsr generate_star_row
    clc
    lda dst_ptr
    adc #40
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    dec row_counter
    bne @star_rows
    rts

; -----------------------------------------------------------------------------
; Player and input

read_input:
    jsr erase_player

    lda STICK0
    sta stick_value

    and #$04                    ; left, active low
    bne @not_left
    lda player_x
    cmp #PLAYER_X_MIN
    beq @not_left
    dec player_x
    dec player_x
@not_left:
    lda stick_value
    and #$08                    ; right
    bne @not_right
    lda player_x
    cmp #PLAYER_X_MAX
    beq @not_right
    inc player_x
    inc player_x
@not_right:
    lda stick_value
    and #$01                    ; up
    bne @not_up
    lda player_y
    cmp #PLAYER_Y_MIN
    beq @not_up
    dec player_y
@not_up:
    lda stick_value
    and #$02                    ; down
    bne @not_down
    lda player_y
    cmp #PLAYER_Y_MAX
    beq @not_down
    inc player_y
@not_down:
    lda player_x
    sta HPOSP0
    sta HPOSP3
    jsr draw_player

    lda TRIG0
    bne @done
    lda bullet_active
    bne @done
    jsr fire_bullet
@done:
    rts

erase_player:
    ldy player_y
    ldx #PLAYER_H
    lda #$00
@loop:
    sta PLAYER0,y
    sta PLAYER3,y
    iny
    dex
    bne @loop
    rts

draw_player:
    ldy player_y
    ldx #$00
@loop:
    lda player_shape,x
    sta PLAYER0,y
    lda player_engine_shape,x
    sta PLAYER3,y
    iny
    inx
    cpx #PLAYER_H
    bne @loop
    rts

fire_bullet:
    lda player_x
    clc
    adc #$04
    sta bullet_x
    sta HPOSM0
    lda player_y
    sec
    sbc #$04
    sta bullet_y
    ldy bullet_y
    lda #$03
    sta MISSILES,y
    lda #$01
    sta bullet_active

    lda #$32
    sta AUDF1
    lda #$A8
    sta AUDC1
    lda #$07
    sta fire_timer
    rts

update_bullet:
    lda bullet_active
    beq @done

    ldy bullet_y
    lda #$00
    sta MISSILES,y

    lda bullet_y
    cmp #$28
    bcc @deactivate
    sec
    sbc #$04
    sta bullet_y
    tay
    lda #$03
    sta MISSILES,y
    rts

@deactivate:
    lda #$00
    sta bullet_active
@done:
    rts

erase_bullet:
    lda bullet_active
    beq @done
    ldy bullet_y
    lda #$00
    sta MISSILES,y
    sta bullet_active
@done:
    rts

; -----------------------------------------------------------------------------
; Enemy

update_enemy:
    jsr erase_enemy

    inc enemy_y
    lda enemy_y
    cmp #$E0
    bcc @horizontal
    jsr reset_enemy
    jmp draw_enemy

@horizontal:
    lda frame_counter
    and #$03
    bne @scanner

    lda enemy_direction
    beq @move_left
@move_right:
    inc enemy_x
    lda enemy_x
    cmp #$C8
    bcc @scanner
    lda #$00
    sta enemy_direction
    jmp @scanner
@move_left:
    dec enemy_x
    lda enemy_x
    cmp #$38
    bcs @scanner
    lda #$01
    sta enemy_direction

@scanner:
    inc scanner_phase
    lda scanner_phase
    and #$0F
    sta scanner_phase

draw_enemy:
    lda enemy_x
    sta HPOSP1
    sta HPOSP2
    ldy enemy_y
    ldx #$00
@body_loop:
    lda enemy_shape,x
    sta PLAYER1,y
    iny
    inx
    cpx #ENEMY_H
    bne @body_loop

    ldy enemy_y
    iny
    iny
    iny
    iny
    iny
    ldx scanner_phase
    lda scanner_shape,x
    sta PLAYER2,y
    rts

erase_enemy:
    ldy enemy_y
    ldx #ENEMY_H
    lda #$00
@loop:
    sta PLAYER1,y
    sta PLAYER2,y
    iny
    dex
    bne @loop
    rts

reset_enemy:
    lda #$30
    sta enemy_y
    jsr random_byte
    and #$7F
    clc
    adc #$38
    sta enemy_x
    lda rng_state
    and #$01
    sta enemy_direction
    rts

; -----------------------------------------------------------------------------
; Collision and score

handle_collisions:
    lda bullet_active
    beq @player_collision
    lda M0PL
    and #$06                    ; missile 0 against players 1 or 2
    beq @player_collision

    jsr erase_bullet
    jsr erase_enemy
    jsr reset_enemy
    jsr draw_enemy
    jsr add_ten_points
    jsr play_hit_sound

@player_collision:
    lda P0PL
    and #$06                    ; player 0 against enemy body/scanner
    beq @clear_latches
    jsr erase_enemy
    jsr reset_enemy
    jsr draw_enemy
    jsr play_hit_sound
    lda #$12
    sta damage_timer

@clear_latches:
    sta HITCLR
    rts

add_ten_points:
    sed
    clc
    lda score_bcd_lo
    adc #$10
    sta score_bcd_lo
    lda score_bcd_hi
    adc #$00
    sta score_bcd_hi
    cld
    jsr update_score_display
    rts

update_score_display:
    lda score_bcd_hi
    lsr
    lsr
    lsr
    lsr
    clc
    adc #CH_ZERO
    sta SCREEN+20

    lda score_bcd_hi
    and #$0F
    clc
    adc #CH_ZERO
    sta SCREEN+21

    lda score_bcd_lo
    lsr
    lsr
    lsr
    lsr
    clc
    adc #CH_ZERO
    sta SCREEN+22

    lda score_bcd_lo
    and #$0F
    clc
    adc #CH_ZERO
    sta SCREEN+23
    rts

; -----------------------------------------------------------------------------
; Starfield

update_starfield:
    dec scroll_timer
    bne @done
    lda #$04
    sta scroll_timer

    lda #<(SCREEN+23*40)
    sta dst_ptr
    lda #>(SCREEN+23*40)
    sta dst_ptr+1
    lda #<(SCREEN+22*40)
    sta src_ptr
    lda #>(SCREEN+22*40)
    sta src_ptr+1
    lda #21
    sta row_counter

@copy_row:
    ldy #39
@copy_byte:
    lda (src_ptr),y
    sta (dst_ptr),y
    dey
    bpl @copy_byte

    sec
    lda src_ptr
    sbc #40
    sta src_ptr
    bcs :+
    dec src_ptr+1
:
    sec
    lda dst_ptr
    sbc #40
    sta dst_ptr
    bcs :+
    dec dst_ptr+1
:
    dec row_counter
    bne @copy_row

    lda #<(SCREEN+80)
    sta dst_ptr
    lda #>(SCREEN+80)
    sta dst_ptr+1
    jsr generate_star_row
@done:
    rts

generate_star_row:
    ldy #$00
@cell:
    jsr random_byte
    and #$0F
    bne @space
    jsr random_byte
    and #$03
    beq @bright
    lda #CH_DOT
    bne @store
@bright:
    lda #CH_STAR
    bne @store
@space:
    lda #CH_SPACE
@store:
    sta (dst_ptr),y
    iny
    cpy #40
    bne @cell
    rts

random_byte:
    lda rng_state
    lsr
    bcc :+
    eor #$B8
:
    sta rng_state
    rts

; -----------------------------------------------------------------------------
; POKEY sound

play_hit_sound:
    lda #$20
    sta AUDF2
    lda #$88
    sta AUDC2
    lda #$0E
    sta hit_timer
    rts

update_sound:
    lda fire_timer
    beq @hit
    dec fire_timer
    inc AUDF1
    lda fire_timer
    bne @hit
    lda #$00
    sta AUDC1

@hit:
    lda hit_timer
    beq @damage
    dec hit_timer
    inc AUDF2
    inc AUDF2
    lda hit_timer
    bne @damage
    lda #$00
    sta AUDC2

@damage:
    lda damage_timer
    beq @normal_background
    dec damage_timer
    lda #$42
    sta COLBK
    rts
@normal_background:
    lda #$00
    sta COLBK
    rts

; -----------------------------------------------------------------------------
; Read-only data

.segment "RODATA"

hud_ascii:
    .byte "DARK FIGHTER  SCORE "
    .byte $00

player_shape:
    .byte %00011000
    .byte %00111100
    .byte %00111100
    .byte %01111110
    .byte %01011010
    .byte %11111111
    .byte %11011011
    .byte %11111111
    .byte %11111111
    .byte %01111110
    .byte %01111110
    .byte %00111100
    .byte %00111100
    .byte %00100100
    .byte %00100100
    .byte %00000000

player_engine_shape:
    .byte $00,$00,$00,$00,$00,$00,$00,$00
    .byte $00,$00,$00,$00
    .byte %00011000
    .byte %00111100
    .byte %00011000
    .byte %00011000

enemy_shape:
    .byte %00011000
    .byte %00111100
    .byte %01111110
    .byte %11011011
    .byte %11111111
    .byte %10111101
    .byte %11111111
    .byte %01111110
    .byte %01100110
    .byte %00100100
    .byte %00100100
    .byte %00011000

scanner_shape:
    .byte $80,$40,$20,$10,$08,$04,$02,$01
    .byte $01,$02,$04,$08,$10,$20,$40,$80

display_list:
    .byte $70,$70,$70              ; 24 blank scan lines
    .byte $42,<SCREEN,>SCREEN      ; ANTIC 2 + LMS
    .repeat 23
        .byte $02
    .endrepeat
    .byte $41,<display_list,>display_list

