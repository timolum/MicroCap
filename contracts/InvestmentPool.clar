(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-AMOUNT u101)
(define-constant ERR-CAMPAIGN-NOT-FOUND u102)
(define-constant ERR-NOT-VERIFIED u103)
(define-constant ERR-INSUFFICIENT-FUNDS u104)
(define-constant ERR-INVALID-CAMPAIGN u105)
(define-constant ERR-ALLOCATION-FAILED u106)
(define-constant ERR-ESCROW-FAILED u107)

(define-data-var total-investments uint u0)
(define-data-var admin principal 'SP000000000000000000002Q6VF78)

(define-map campaigns
  uint
  { name: (string-utf8 50), goal: uint, raised: uint, active: bool, tokens-per-stx: uint }
)

(define-map investments
  { investor: principal, campaign: uint }
  { amount: uint, tokens: uint, timestamp: uint }
)

(define-map balances
  principal
  uint
)

(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

(define-private (validate-amount (amt uint))
  (if (> amt u0) (ok true) (err ERR-INVALID-AMOUNT))
)

(define-private (validate-campaign (id uint))
  (match (map-get? campaigns id)
    c
      (if (get active c)
          (ok true)
          (err ERR-INVALID-CAMPAIGN))
    (err ERR-CAMPAIGN-NOT-FOUND))
)

(define-public (create-campaign
  (id uint)
  (name (string-utf8 50))
  (goal uint)
  (tokens-per-stx uint)
)
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (> (len name) u0) (err ERR-INVALID-AMOUNT))
    (asserts! (<= (len name) u50) (err ERR-INVALID-AMOUNT))
    (try! (validate-amount goal))
    (try! (validate-amount tokens-per-stx))
    (map-set campaigns id
      { name: name, goal: goal, raised: u0, active: true, tokens-per-stx: tokens-per-stx }
    )
    (print { event: "campaign-created", id: id })
    (ok true)
  )
)

(define-public (invest (campaign-id uint) (amount uint))
  (let (
        (caller tx-sender)
        (camp (unwrap! (map-get? campaigns campaign-id) (err ERR-CAMPAIGN-NOT-FOUND)))
        (new-raised (+ (get raised camp) amount))
        (max-raised (get goal camp))
      )
    (asserts! (get active camp) (err ERR-INVALID-CAMPAIGN))
    (try! (validate-amount amount))
    (asserts! (>= (stx-get-balance tx-sender) amount) (err ERR-INSUFFICIENT-FUNDS))
    (asserts! (<= new-raised max-raised) (err ERR-INVALID-AMOUNT))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (let (
          (tokens (* amount (get tokens-per-stx camp)))
          (key { investor: caller, campaign: campaign-id })
        )
      (map-set investments key { amount: amount, tokens: tokens, timestamp: block-height })
      (map-set campaigns campaign-id
        { name: (get name camp), goal: (get goal camp), raised: new-raised, active: (get active camp), tokens-per-stx: (get tokens-per-stx camp) }
      )
      (map-set balances caller (+ (default-to u0 (map-get? balances caller)) tokens))
      (var-set total-investments (+ (var-get total-investments) amount))
      (print { event: "investment-made", campaign: campaign-id, amount: amount, tokens: tokens })
      (ok tokens)
    )
  )
)

(define-public (close-campaign (id uint))
  (let (
        (camp (unwrap! (map-get? campaigns id) (err ERR-CAMPAIGN-NOT-FOUND)))
      )
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (get active camp) (err ERR-INVALID-CAMPAIGN))
    (map-set campaigns id
      { name: (get name camp), goal: (get goal camp), raised: (get raised camp), active: false, tokens-per-stx: (get tokens-per-stx camp) }
    )
    (print { event: "campaign-closed", id: id })
    (ok true)
  )
)

(define-read-only (get-campaign (id uint))
  (map-get? campaigns id)
)

(define-read-only (get-investment (investor principal) (campaign uint))
  (map-get? investments { investor: investor, campaign: campaign })
)

(define-read-only (get-balance (who principal))
  (default-to u0 (map-get? balances who))
)

(define-read-only (get-total-investments)
  (var-get total-investments)
)

(define-public (transfer-tokens (to principal) (tokens uint))
  (let (
        (from-balance (get-balance tx-sender))
      )
    (asserts! (>= from-balance tokens) (err ERR-INVALID-AMOUNT))
    (asserts! (not (is-eq tx-sender to)) (err ERR-INVALID-AMOUNT))
    (map-set balances tx-sender (- from-balance tokens))
    (map-set balances to (+ (default-to u0 (map-get? balances to)) tokens))
    (print { event: "tokens-transferred", from: tx-sender, to: to, tokens: tokens })
    (ok true)
  )
)

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-NOT-AUTHORIZED))
    (var-set admin new-admin)
    (ok true)
  )
)