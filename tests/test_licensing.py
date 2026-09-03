import importlib.util
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('bygeorge_license', root / 'packaging' / 'bygeorge_license.py')
licensing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(licensing)


class LicenseGateTests(unittest.TestCase):
    def setUp(self):
        self.messages = []
        self.pyrevit = types.SimpleNamespace(
            forms=types.SimpleNamespace(ask_for_string=lambda **kw: 'BG-TEST', alert=lambda message, **kw: self.messages.append(message)),
            script=types.SimpleNamespace(exit=lambda: None))
        self.module_patch = patch.dict(sys.modules, {'pyrevit': self.pyrevit})
        self.module_patch.start()

    def tearDown(self):
        self.module_patch.stop()

    def test_authorized_cennerit_proceeds(self):
        with patch.object(licensing, '_load_key', return_value='BG-TEST'), patch.object(licensing, '_device_id', return_value='1'*64), patch.object(licensing, '_request', return_value={'valid': True, 'feature': 'cennerit'}):
            self.assertTrue(licensing.require_entitlement('cennerit'))

    def test_wrong_feature_or_invalid_result_stops_before_payload(self):
        for result in ({'valid': False}, {'valid': True, 'feature': 'other'}, {}):
            with patch.object(licensing, '_load_key', return_value='BG-TEST'), patch.object(licensing, '_device_id', return_value='1'*64), patch.object(licensing, '_request', return_value=result):
                with self.assertRaises(SystemExit):
                    licensing.require_entitlement('cennerit')
        self.assertEqual(len(self.messages), 3)

    def test_network_failure_is_clear_and_blocks_tool(self):
        with patch.object(licensing, '_load_key', return_value='BG-TEST'), patch.object(licensing, '_device_id', return_value='1'*64), patch.object(licensing, '_request', side_effect=OSError('Connection unavailable')):
            with self.assertRaises(SystemExit):
                licensing.require_entitlement('cennerit')
        self.assertIn('No model changes were made', self.messages[0])

    def test_cancelled_prompt_never_contacts_server(self):
        self.pyrevit.forms.ask_for_string = lambda **kw: None
        with patch.object(licensing, '_load_key', return_value=None), patch.object(licensing, '_device_id', return_value='1'*64), patch.object(licensing, '_request') as request:
            with self.assertRaises(SystemExit):
                licensing.require_entitlement('cennerit')
            request.assert_not_called()

    def test_new_key_is_saved_only_after_authorization(self):
        with patch.object(licensing, '_load_key', return_value=None), patch.object(licensing, '_device_id', return_value='1'*64), patch.object(licensing, '_request', side_effect=ValueError('Not entitled')), patch.object(licensing, '_save_key') as save:
            with self.assertRaises(SystemExit):
                licensing.require_entitlement('cennerit')
            save.assert_not_called()

    def test_replacement_key_is_validated_and_saved_for_only_this_tool(self):
        self.pyrevit.forms.ask_for_string = lambda **kw: 'BG-REPLACEMENT'
        with patch.object(licensing, '_load_key', return_value='BG-OLD'), patch.object(licensing, '_device_id', return_value='1'*64), patch.object(licensing, '_request', side_effect=[ValueError('Not entitled'), {'valid': True, 'feature': 'cennerit'}]) as request, patch.object(licensing, '_save_key') as save:
            self.assertTrue(licensing.require_entitlement('cennerit'))
            self.assertEqual(request.call_count, 2)
            save.assert_called_once_with('BG-REPLACEMENT', 'cennerit')

    def test_individual_purchases_keep_separate_protected_key_files(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory, patch.object(licensing, '_folder', return_value=directory), patch.object(licensing, '_protect', side_effect=lambda value, decrypt=False: value):
            licensing._save_key('BG-FIRST', 'cennerit')
            licensing._save_key('BG-SECOND', 'datalink')
            self.assertEqual(licensing._load_key('cennerit'), 'BG-FIRST')
            self.assertEqual(licensing._load_key('datalink'), 'BG-SECOND')


if __name__ == '__main__':
    unittest.main()
