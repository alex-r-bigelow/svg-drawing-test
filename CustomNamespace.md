The namespace I'm using for special attributes: `xmlns:svgDrawingTest="https://github.com/alex-r-bigelow/svg-drawing-test/blob/master/CustomNamespace.md"` (the URI points to this document).

Variable definitions
====================

- P = (consolidated) ancestral transformation matrix
- T = current element's transformation matrix (derived from its `transform` tag)
- B = the matrix that describes how to get from the parent to the element's anchor point (stored in a custom `svgDrawingTest:preAnchorMatrix` attribute)
- A = the matrix that describes how to get from the anchor point to the element's coordinate system (stored in a custom `svgDrawingTest:postAnchorMatrix` attribute)

In general, `T = B * A`

How to calculate stuff
======================

- Calculate global position of anchor point: `P * B * <0, 0>`
- New manipulation transformation matrix `M` needs to be applied to the element, relative to the anchor point
  - goal: update `A` and `T`
  - `A_1 = M * A_0`
  - `T_1 = B * A_1`
- Anchor movement transformation matrix `M` needs to be applied to the element's anchor point, without moving the element itself
  - goal: update `B` and `A` (`T` should not change)
  - `B_1 = M * B_0`
  - `A_1 = inverse(B_1) * T`
