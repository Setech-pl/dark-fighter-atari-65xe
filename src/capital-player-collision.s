.setcpu "6502"

; Final-raster BROADSIDE bolt versus Viper collision.
; Entry: X is the BROADSIDE slot; src_ptr is the inclusive swept bolt L/R,
; dst_ptr is the inclusive 16-HPOS player L/R, and frontend_data_ptr is the
; half-open interval of bolt centre Y values that overlap the 15-line player.
; Exit: carry set on swept-AABB contact. The caller restores its slot.

BROAD_Y = $4E4C
src_ptr = $94
dst_ptr = $96
frontend_data_ptr = $98

.segment "COLLISION"
.export capital_player_collision, capital_player_collision_hit, capital_player_collision_miss

capital_player_collision:
    ; Inclusive horizontal intervals: swept 8-HPOS bolt versus 16-HPOS player.
    lda src_ptr+1
    cmp dst_ptr
    bcc capital_player_collision_miss
    lda dst_ptr+1
    cmp src_ptr
    bcc capital_player_collision_miss

    ; BROAD_Y is the bolt centre. The caller maps player [Y..Y+14] against
    ; bolt [BROAD_Y-3..BROAD_Y+2] to the exact half-open centre interval
    ; [player_y-2..player_y+18).
    lda BROAD_Y,x
    cmp frontend_data_ptr
    bcc capital_player_collision_miss
    cmp frontend_data_ptr+1
    bcs capital_player_collision_miss
capital_player_collision_hit:
    sec
    rts
capital_player_collision_miss:
    clc
    rts

.assert * <= $8E7C, error, "swept-AABB capital/player collision exceeds reviewed runtime tail"
