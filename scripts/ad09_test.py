import unittest
from ad09_uv_audit import uv_region
class UVTests(unittest.TestCase):
 def test_rotated_trim(self):
  r=uv_region({'name':'rot','fields':{'bounds':'16,8,12,20','rotate':'90','offsets':'2,3,20,30'}},[80,40],[64,64]);self.assertEqual(r['uv'],[.2,.2,.45,.5]);self.assertEqual(r['region_attachment_uvs'],[.45,.5,.2,.5,.2,.2,.45,.2]);self.assertEqual(r['offsets'],[2,3,20,30]);self.assertEqual(r['mapped_pixel_edges'],[12.8,12.8,28.8,32.0])
 def test_unrotated(self):
  r=uv_region({'name':'reg','fields':{'bounds':'10,20,20,10'}},[100,100],[50,50]);self.assertEqual(r['uv'],[.1,.2,.3,.3]);self.assertEqual(r['offsets'],[0,0,20,10]);self.assertEqual(r['region_attachment_uvs'],[.1,.3,.1,.2,.3,.2,.3,.3])
 def test_malformed(self):
  for fields in [{'bounds':'90,0,20,10'},{'bounds':'1,1,2,2','rotate':'45'},{'bounds':'1,1,20,10','offsets':'2,0,20,10'}]:
   with self.assertRaises(ValueError):uv_region({'name':'bad','fields':fields},[100,100],[64,64])
if __name__=='__main__':unittest.main()
