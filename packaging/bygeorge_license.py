# -*- coding: utf-8 -*-
"""Shared online license gate for pyRevit IronPython. No model API calls."""
from __future__ import print_function
import os
import json
import hashlib


def _folder():
    return os.path.join(os.environ['APPDATA'], 'ByGeorge', 'Licensing')


def _device_id():
    import clr
    clr.AddReference('System')
    from Microsoft.Win32 import RegistryKey, RegistryHive, RegistryView
    base = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64)
    try:
        key = base.OpenSubKey(r'SOFTWARE\Microsoft\Cryptography')
        try:
            value = str(key.GetValue('MachineGuid'))
        finally:
            key.Close()
    finally:
        base.Close()
    if not value or value == 'None':
        raise ValueError('Windows device identifier unavailable')
    return hashlib.sha256(('ByGeorge:' + value).encode('utf-8')).hexdigest()


def _protect(data, decrypt=False):
    import clr
    clr.AddReference('System.Security')
    from System import Convert
    from System.Text import Encoding
    from System.Security.Cryptography import ProtectedData, DataProtectionScope
    if decrypt:
        return Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(data), None, DataProtectionScope.CurrentUser))
    return Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(data), None, DataProtectionScope.CurrentUser))


def _load_key(feature):
    try:
        target = os.path.join(_folder(), feature + '.dat')
        if not os.path.isfile(target):
            target = os.path.join(_folder(), 'license.dat')
        with open(target, 'r') as stream:
            return _protect(stream.read(), decrypt=True)
    except Exception:
        return None


def _save_key(key, feature):
    folder = _folder()
    if not os.path.isdir(folder):
        os.makedirs(folder)
    target = os.path.join(folder, feature + '.dat')
    # A key is persisted only after the server validates an entitlement.
    with open(target, 'w') as stream:
        stream.write(_protect(key))


def _request(key, machine, feature):
    import clr
    clr.AddReference('System')
    from System.Net import WebRequest, WebException
    from System.IO import StreamReader
    from System.Text import Encoding
    with open(os.path.join(os.path.dirname(__file__), 'license-config.json'), 'r') as stream:
        config = json.load(stream)
    base = config['url'].rstrip('/')
    if not base.startswith('https://'):
        raise ValueError('A secure licensing server is required')
    request = WebRequest.Create(base + '/api/bim/activate')
    request.Method = 'POST'
    request.ContentType = 'application/json'
    request.Timeout = 10000
    request.ReadWriteTimeout = 10000
    payload = Encoding.UTF8.GetBytes(json.dumps({'key': key, 'machine': machine, 'feature': feature}))
    request.ContentLength = payload.Length
    stream = request.GetRequestStream()
    try:
        stream.Write(payload, 0, payload.Length)
    finally:
        stream.Close()
    try:
        response = request.GetResponse()
    except WebException as error:
        response = error.Response
        if response is None:
            raise
    try:
        reader = StreamReader(response.GetResponseStream())
        try:
            result = json.loads(reader.ReadToEnd())
        finally:
            reader.Close()
    finally:
        response.Close()
    if result.get('valid') is not True or result.get('feature') != feature:
        raise ValueError(result.get('error', 'This key does not include this tool.'))
    if result.get('mode') != config['mode']:
        raise ValueError('This key belongs to a different payment environment.')
    return result


def require_entitlement(feature):
    from pyrevit import forms, script
    try:
        if not feature or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in feature):
            raise ValueError('Invalid tool identifier.')
        key = _load_key(feature)
        machine = _device_id()
        if key:
            try:
                result = _request(key.strip().upper(), machine, feature)
                if result.get('valid') is True and result.get('feature') == feature:
                    return True
                raise ValueError('The saved key does not authorize this tool.')
            except ValueError:
                # A different purchase or replacement key may authorize this tool.
                key = None
        if not key:
            key = forms.ask_for_string(prompt='Enter the activation key for {0} (or your suite key) from your ByGeorge receipt.'.format(feature), title='Activate ByGeorge')
        if not key:
            script.exit()
            raise SystemExit()
        key = key.strip().upper()
        result = _request(key, machine, feature)
        if result.get('valid') is not True or result.get('feature') != feature:
            raise ValueError('The server did not authorize this tool.')
        _save_key(key, feature)
        return True
    except Exception as error:
        forms.alert('ByGeorge could not activate this tool.\n\n{0}\n\nCheck your internet connection and purchased tools. No model changes were made. For a replacement key or device reset, contact support.'.format(str(error)), title='ByGeorge activation')
        script.exit()
        raise SystemExit()
