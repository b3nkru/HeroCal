const ACCOUNT_LABELS = {
  account1: 'Account 1',
  account2: 'Account 2',
  account3: 'Account 3',
}

export default function Sidebar({
  accounts,
  calendars,
  visibleCalendars,
  onToggleCalendar,
  onToggleAccount,
  onDisconnect,
}) {
  const accountIds = ['account1', 'account2', 'account3']

  return (
    <aside className="sidebar">
      <div className="sidebar-title">HeroCal</div>

      {accountIds.map(aid => {
        const acct = accounts[aid] || {}
        const acctCals = calendars.filter(c => c.account_id === aid)
        const allOn = acctCals.length > 0 && acctCals.every(c => visibleCalendars.has(c.id))

        return (
          <div key={aid} className="account-section">
            <div className="account-header">
              <div className="account-info">
                <span className={`dot ${acct.connected ? 'dot-green' : 'dot-gray'}`} />
                <span className="account-label">
                  {acct.email || ACCOUNT_LABELS[aid]}
                </span>
              </div>
              <div className="account-actions">
                {acct.connected ? (
                  <>
                    {acctCals.length > 0 && (
                      <button
                        className="btn-ghost"
                        title={allOn ? 'Hide all' : 'Show all'}
                        onClick={() => onToggleAccount(aid)}
                      >
                        {allOn ? '◉' : '○'}
                      </button>
                    )}
                    <button
                      className="btn-ghost btn-danger-ghost"
                      title="Disconnect"
                      onClick={() => onDisconnect(aid)}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <a
                    href={`/api/auth/connect/${aid}`}
                    className="btn-connect"
                  >
                    Connect
                  </a>
                )}
              </div>
            </div>

            {acctCals.map(cal => (
              <label key={cal.id} className="cal-item">
                <input
                  type="checkbox"
                  checked={visibleCalendars.has(cal.id)}
                  onChange={() => onToggleCalendar(cal.id)}
                />
                <span
                  className="cal-dot"
                  style={{ background: cal.backgroundColor }}
                />
                <span className="cal-name">{cal.summary}</span>
              </label>
            ))}

            {!acct.connected && (
              <p className="account-hint">Connect to see calendars</p>
            )}
          </div>
        )
      })}
    </aside>
  )
}
