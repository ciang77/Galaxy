!macro customInstall
  SetOutPath "$INSTDIR"
  FileOpen $0 "$INSTDIR\.galaxy-install-user-home" w
  FileWrite $0 "$PROFILE"
  FileClose $0
!macroend

!macro customUnInstall
  StrCpy $1 "$PROFILE"
  IfFileExists "$INSTDIR\.galaxy-install-user-home" 0 galaxy_cleanup_home_done
    FileOpen $0 "$INSTDIR\.galaxy-install-user-home" r
    FileRead $0 $1
    FileClose $0
  galaxy_cleanup_home_done:

  IfFileExists "$INSTDIR\Galaxy.exe" 0 galaxy_cleanup_done
  IfFileExists "$INSTDIR\resources\app.asar.unpacked\hooks\cleanup-integrations.js" 0 galaxy_cleanup_done
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("ELECTRON_RUN_AS_NODE", "1").r0'
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("GALAXY_VARIANT", "1").r0'
    nsExec::ExecToLog '"$INSTDIR\Galaxy.exe" "$INSTDIR\resources\app.asar.unpacked\hooks\cleanup-integrations.js" --apply --user-home "$1" --source nsis --fail-open'
    Pop $0
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("GALAXY_VARIANT", "").r0'
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i("ELECTRON_RUN_AS_NODE", "").r0'
  galaxy_cleanup_done:
!macroend
